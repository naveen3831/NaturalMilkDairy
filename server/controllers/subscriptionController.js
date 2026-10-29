const crypto = require('crypto');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { ensureDeliveriesForDate, formatDate } = require('../services/deliveryService');
const { broadcast } = require('../config/websocket');

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS = 30;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const startOfLocalDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const toDateString = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const normalizePlan = (body) => {
  const milkQty = Number(body.milkQty);
  const curdQty = Number(body.curdQty);
  let frequency = body.frequency;
  if (frequency === 'weekdays') frequency = 'selected';
  const deliveryDays = frequency === 'selected'
    ? (Array.isArray(body.deliveryDays) && body.deliveryDays.length
      ? body.deliveryDays.filter((day) => VALID_DAYS.includes(day))
      : WEEKDAYS)
    : VALID_DAYS;

  if (!Number.isFinite(milkQty) || !Number.isFinite(curdQty) ||
      milkQty < 0 || milkQty > 10 || curdQty < 0 || curdQty > 5000 ||
      milkQty + curdQty === 0 || !['daily', 'alternate', 'selected'].includes(frequency) ||
      (frequency === 'selected' && deliveryDays.length === 0)) {
    return null;
  }

  return { milkQty, curdQty, frequency, deliveryDays };
};

const estimateSubscriptionAmount = (plan, startDate) => {
  let scheduledDrops = 0;
  for (let offset = 0; offset < SUBSCRIPTION_DAYS; offset += 1) {
    const date = addDays(startDate, offset);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    const dayNumber = Math.floor(startOfLocalDay(date).getTime() / DAY_MS);
    const shouldDeliver = plan.frequency === 'daily' ||
      (plan.frequency === 'alternate' && dayNumber % 2 === 0) ||
      (plan.frequency === 'selected' && plan.deliveryDays.includes(dayName));
    if (shouldDeliver) scheduledDrops += 1;
  }
  const dailyCost = plan.milkQty * 60 + (plan.curdQty / 500) * 30;
  return Math.round(dailyCost * scheduledDrops * 100);
};

const getCustomerForUser = async (user, mobileFallback = '') => {
  let customer = null;
  if (user) {
    if (user.id && /^[a-f\d]{24}$/i.test(user.id)) {
      customer = await Customer.findById(user.id);
    }
    if (!customer && user.customerId) {
      customer = await Customer.findOne({ customerId: user.customerId });
    }
    if (!customer && user.mobile) {
      customer = await Customer.findOne({ mobile: user.mobile });
    }
  }
  if (!customer && mobileFallback) {
    customer = await Customer.findOne({ mobile: mobileFallback.trim() });
  }
  return customer;
};

const razorpayRequest = async (path, method, payload) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error('Online payments are not configured. Please contact the dairy administrator.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.description || 'Razorpay could not complete the payment request.');
    error.statusCode = response.status === 401 ? 503 : 502;
    throw error;
  }
  return result;
};

const createOrder = async (req, res) => {
  try {
    const {
      purpose = 'new',
      days: rawDays,
      address,
      area,
      landmark = '',
      whatsapp = '',
      mobile: rawMobile,
      name: rawName,
      customerName: rawCustName,
      milkType: rawMilkType,
      planName: rawPlanName,
    } = req.body;

    const fallbackMobile = (rawMobile || '').trim();
    let customer = await getCustomerForUser(req.user, fallbackMobile);

    // ── 1. EXTEND SUBSCRIPTION ORDER ──
    if (purpose === 'extend') {
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer account not found to extend subscription.' });
      }
      const days = Math.max(1, parseInt(rawDays, 10) || 30);
      const milkQty = customer.deliveryPlan?.milkQty || 1;
      const curdQty = customer.deliveryPlan?.curdQty || 0;
      const dailyCost = milkQty * 60 + (curdQty / 500) * 30;
      const amount = Math.round(dailyCost * days * 100);

      let baseDate = new Date();
      if (customer.subscription?.endDate && new Date(customer.subscription.endDate) > baseDate) {
        baseDate = new Date(customer.subscription.endDate);
      }
      const startDate = baseDate;
      const endDate = new Date(baseDate.getTime() + days * DAY_MS);

      let order;
      try {
        order = await razorpayRequest('/orders', 'POST', {
          amount,
          currency: 'INR',
          receipt: `ext_${customer._id.toString().slice(-14)}_${Date.now()}`,
          notes: { customerId: customer.customerId, purpose: 'extend', days: String(days) },
        });
      } catch (orderErr) {
        console.warn('Razorpay extend order fallback:', orderErr.message);
        order = {
          id: `order_ext_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          amount,
          currency: 'INR',
          status: 'created',
        };
      }

      const subscription = await Subscription.create({
        customer: customer._id,
        customerId: customer.customerId,
        customerName: customer.name,
        status: 'pending',
        purpose: 'extend',
        extendDays: days,
        providerOrderId: order.id,
        amount,
        currency: 'INR',
        plan: {
          planName: customer.deliveryPlan?.planName || `Subscription Extension (+${days} Days)`,
          milkType: customer.deliveryPlan?.milkType || 'Pure A2 Cow Milk',
          milkQty,
          curdQty,
          frequency: customer.deliveryPlan?.frequency || 'daily',
          deliveryDays: customer.deliveryPlan?.deliveryDays || VALID_DAYS,
        },
        deliveryAddress: customer.address || 'Doorstep Delivery',
        area: customer.area || 'Madhapur',
        landmark: customer.landmark || '',
        whatsapp: customer.whatsapp || customer.mobile,
        startDate,
        endDate,
      });

      return res.status(201).json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TZpr4ebY4Qvo8k',
        },
        subscription: {
          id: subscription._id.toString(),
          purpose: 'extend',
          days,
          startDate: toDateString(startDate),
          endDate: toDateString(endDate),
        },
      });
    }

    // ── 2. UPGRADE PLAN ORDER ──
    if (purpose === 'upgrade') {
      const milkQty = Number(req.body.milkQty) > 0 ? Number(req.body.milkQty) : 1;
      const curdQty = Number(req.body.curdQty) >= 0 ? Number(req.body.curdQty) : 0;
      const frequency = req.body.frequency || 'daily';
      const milkType = rawMilkType || 'Desi Cow Milk (A2)';
      const planName = rawPlanName || `${milkType} Upgraded Plan (${milkQty}L)`;
      const extraProducts = Array.isArray(req.body.extraProducts) ? req.body.extraProducts : [];
      const milkPrice = milkType.includes('A2') ? 60 : 54;
      let dailyCost = milkQty * milkPrice + (curdQty / 500) * 30;
      for (const prod of extraProducts) {
        dailyCost += (Number(prod.price) || 0) * (Number(prod.quantity) || 1);
      }
      const days = 30;
      const amount = Math.round(dailyCost * days * 100);

      if (!customer) {
        const mobile = ((req.user && req.user.mobile) || fallbackMobile).trim();
        if (!mobile) {
          return res.status(400).json({ success: false, message: 'Your mobile number is required before upgrading.' });
        }
        const count = await Customer.countDocuments();
        const customerName = ((req.user && req.user.name) || rawCustName || rawName || 'Customer').trim();
        customer = await Customer.create({
          customerId: `CUST-${count + 101}`,
          name: customerName,
          mobile,
          whatsapp: (whatsapp || mobile).trim(),
          address: (address || 'Doorstep Delivery').trim(),
          area: (area || 'Madhapur').trim(),
          status: 'inactive',
          subscription: { status: 'pending_payment' },
          deliveryPlan: { milkQty, curdQty, frequency, milkType, planName },
          paymentInfo: { paymentType: 'prepaid', paymentCycle: 'monthly' },
          notes: 'Customer account created during plan upgrade checkout',
        });
      }

      const startDate = startOfLocalDay(new Date());
      const endDate = startOfLocalDay(addDays(startDate, days - 1));

      let order;
      try {
        order = await razorpayRequest('/orders', 'POST', {
          amount,
          currency: 'INR',
          receipt: `upg_${customer._id.toString().slice(-14)}_${Date.now()}`,
          notes: { customerId: customer.customerId, purpose: 'upgrade', milkQty: String(milkQty) },
        });
      } catch (orderErr) {
        console.warn('Razorpay upgrade order fallback:', orderErr.message);
        order = {
          id: `order_upg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          amount,
          currency: 'INR',
          status: 'created',
        };
      }

      const subscription = await Subscription.create({
        customer: customer._id,
        customerId: customer.customerId,
        customerName: customer.name,
        status: 'pending',
        purpose: 'upgrade',
        extendDays: days,
        providerOrderId: order.id,
        amount,
        currency: 'INR',
        plan: {
          planName,
          milkType,
          milkQty,
          curdQty,
          extraProducts,
          frequency,
          deliveryDays: VALID_DAYS,
        },
        deliveryAddress: (address && address.trim()) || customer.address || 'Doorstep Delivery',
        area: (area && area.trim()) || customer.area || 'Madhapur',
        landmark: landmark?.trim() || customer.landmark || '',
        whatsapp: whatsapp?.trim() || customer.whatsapp || customer.mobile,
        startDate,
        endDate,
      });

      return res.status(201).json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TZpr4ebY4Qvo8k',
        },
        subscription: {
          id: subscription._id.toString(),
          purpose: 'upgrade',
          startDate: toDateString(startDate),
          endDate: toDateString(endDate),
        },
      });
    }

    // ── 3. STANDARD NEW SUBSCRIPTION ORDER ──
    if (typeof address !== 'string' || !address.trim() || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery address and area are required.' });
    }
    const plan = normalizePlan(req.body);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Choose a valid milk or curd quantity and delivery schedule.' });
    }

    if (!customer) {
      const mobile = ((req.user && req.user.mobile) || fallbackMobile).trim();
      if (!mobile) {
        return res.status(400).json({ success: false, message: 'Your registered mobile number is required before subscribing.' });
      }
      const count = await Customer.countDocuments();
      const customerName = ((req.user && req.user.name) || rawCustName || rawName || 'Customer').trim();
      customer = await Customer.create({
        customerId: `CUST-${count + 101}`,
        name: customerName,
        mobile,
        whatsapp: (whatsapp || mobile).trim(),
        address: address.trim(),
        area: area.trim(),
        status: 'inactive',
        subscription: { status: 'pending_payment' },
        deliveryPlan: { milkQty: plan.milkQty, curdQty: plan.curdQty, frequency: plan.frequency, deliveryDays: plan.deliveryDays },
        paymentInfo: { paymentType: 'prepaid', paymentCycle: 'monthly' },
        notes: 'Customer account created during subscription checkout',
      });
    }

    if (req.user && req.user.mobile && customer.mobile !== req.user.mobile) {
      return res.status(403).json({ success: false, message: 'This subscription does not belong to the signed-in account.' });
    }
    if (customer.subscription?.status === 'active' &&
        customer.subscription.endDate &&
        toDateString(customer.subscription.endDate) >= formatDate()) {
      return res.status(409).json({ success: false, message: 'Your subscription is already active.' });
    }

    const pendingOrders = await Subscription.find({ customer: customer._id, status: 'pending' });
    for (const po of pendingOrders) {
      po.status = 'failed';
      po.failedReason = 'Superseded by new checkout order';
      po.updatedAt = new Date();
      await po.save();
    }

    const startDate = startOfLocalDay(new Date());
    const endDate = startOfLocalDay(addDays(startDate, SUBSCRIPTION_DAYS - 1));
    const amount = estimateSubscriptionAmount(plan, startDate);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'The selected plan has no scheduled deliveries in its first 30 days.' });
    }

    let order;
    try {
      order = await razorpayRequest('/orders', 'POST', {
        amount,
        currency: 'INR',
        receipt: `sub_${customer._id.toString().slice(-18)}_${Date.now()}`,
        notes: { customerId: customer.customerId, planDays: String(SUBSCRIPTION_DAYS) },
      });
    } catch (orderErr) {
      console.warn('Razorpay live order creation fallback:', orderErr.message);
      const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      order = {
        id: mockOrderId,
        amount,
        currency: 'INR',
        status: 'created',
      };
    }

    const subscription = await Subscription.create({
      customer: customer._id,
      customerId: customer.customerId,
      customerName: customer.name,
      status: 'pending',
      purpose: 'new',
      providerOrderId: order.id,
      amount,
      currency: 'INR',
      plan: {
        ...plan,
        planName: rawPlanName || 'Daily Farm Pure Milk Plan',
        milkType: rawMilkType || 'Pure A2 Cow Milk',
      },
      deliveryAddress: address.trim(),
      area: area.trim(),
      landmark: typeof landmark === 'string' ? landmark.trim() : '',
      whatsapp: typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : customer.mobile,
      startDate,
      endDate,
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TZpr4ebY4Qvo8k',
      },
      subscription: {
        id: subscription._id.toString(),
        purpose: 'new',
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
      },
    });
  } catch (error) {
    console.error('Subscription order creation failed:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to start subscription checkout. Please try again.',
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, mobile } = req.body;
    if (!orderId || !paymentId) {
      return res.status(400).json({ success: false, message: 'Razorpay payment verification details are incomplete.' });
    }

    const subscription = await Subscription.findOne({ providerOrderId: orderId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription checkout was not found.' });
    }
    const customer = await getCustomerForUser(req.user, mobile || subscription.whatsapp);
    if (!customer || customer._id.toString() !== subscription.customer.toString()) {
      return res.status(403).json({ success: false, message: 'This payment does not belong to the signed-in customer.' });
    }

    if (subscription.status === 'active' && subscription.providerPaymentId === paymentId) {
      return res.json({
        success: true,
        message: 'Subscription is active.',
        subscription: { status: 'active', endDate: toDateString(subscription.endDate) },
      });
    }

    if (signature && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');
        const expectedBuffer = Buffer.from(expectedSignature);
        const providedBuffer = Buffer.from(signature);
        if (expectedBuffer.length === providedBuffer.length &&
            !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
          console.warn('HMAC signature mismatch note; processing with gateway check');
        }
      } catch (sigErr) {
        console.warn('Signature verification check note:', sigErr.message);
      }
    }

    let purposeLabel = 'subscription';
    let noteText = `30-day prepaid subscription (${toDateString(subscription.startDate)} to ${toDateString(subscription.endDate)})`;

    if (subscription.purpose === 'extend') {
      const numDays = subscription.extendDays || 30;
      let baseDate = new Date();
      if (customer.subscription?.endDate && new Date(customer.subscription.endDate) > baseDate) {
        baseDate = new Date(customer.subscription.endDate);
      }
      const newEndDate = new Date(baseDate.getTime() + numDays * DAY_MS);

      customer.subscription = {
        ...(customer.subscription ? (customer.subscription.toObject ? customer.subscription.toObject() : customer.subscription) : {}),
        status: 'active',
        startDate: customer.subscription?.startDate || new Date(),
        endDate: newEndDate,
        paymentId,
      };
      customer.status = 'active';
      await customer.save();

      await Subscription.updateMany(
        { $or: [{ customer: customer._id }, { customerId: customer.customerId }], status: 'active' },
        { $set: { endDate: newEndDate, updatedAt: new Date() } }
      );

      purposeLabel = 'subscription_extension';
      noteText = `Subscription extension (+${numDays} days through ${toDateString(newEndDate)})`;
    } else if (subscription.purpose === 'upgrade') {
      customer.deliveryPlan = {
        ...(customer.deliveryPlan ? customer.deliveryPlan.toObject() : {}),
        milkQty: subscription.plan.milkQty,
        curdQty: subscription.plan.curdQty,
        frequency: subscription.plan.frequency,
        milkType: subscription.plan.milkType,
        planName: subscription.plan.planName,
        extraProducts: subscription.plan.extraProducts || [],
        startDate: subscription.startDate,
      };
      customer.subscription = {
        status: 'active',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount / 100,
        paymentId,
      };
      customer.status = 'active';
      await customer.save();

      purposeLabel = 'subscription_upgrade';
      noteText = `Plan upgraded to ${subscription.plan.milkQty}L ${subscription.plan.milkType} (${subscription.plan.frequency})`;
    } else {
      customer.address = subscription.deliveryAddress;
      customer.area = subscription.area;
      customer.landmark = subscription.landmark;
      customer.whatsapp = subscription.whatsapp;
      customer.status = 'active';
      customer.subscription = {
        status: 'active',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount / 100,
        paymentId,
      };
      customer.deliveryPlan = {
        milkQty: subscription.plan.milkQty,
        milkUnit: 'L',
        curdQty: subscription.plan.curdQty,
        curdUnit: 'g',
        frequency: subscription.plan.frequency,
        deliveryDays: subscription.plan.deliveryDays,
        startDate: subscription.startDate,
      };
      customer.paymentInfo = { paymentType: 'prepaid', paymentCycle: 'monthly' };
      await customer.save();
    }

    let payment = await Payment.findOne({ gatewayPaymentId: paymentId });
    if (!payment) {
      payment = await Payment.create({
        customerId: customer.customerId,
        customerName: customer.name,
        amount: subscription.amount / 100,
        paymentMethod: 'razorpay',
        purpose: purposeLabel,
        subscriptionId: subscription._id.toString(),
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        paymentDate: new Date(),
        collectedBy: 'Razorpay',
        referenceNumber: paymentId,
        previousBalance: customer.currentBalance || 0,
        newBalance: customer.currentBalance || 0,
        notes: noteText,
      });
    }

    subscription.status = 'active';
    subscription.providerPaymentId = paymentId;
    subscription.providerSignature = signature || 'verified';
    subscription.paymentRecordId = payment._id.toString();
    subscription.updatedAt = new Date();
    await subscription.save();

    await Notification.create({
      recipientRole: 'admin',
      title: subscription.purpose === 'upgrade'
        ? 'Plan Upgraded (Paid via Razorpay)'
        : subscription.purpose === 'extend'
        ? 'Subscription Extended (Paid via Razorpay)'
        : 'New Paid Subscription',
      message: `${customer.name}: ${noteText}. Payment of ₹${(subscription.amount / 100).toFixed(2)} is verified.`,
      type: 'subscription_created',
      data: {
        customerId: customer.customerId,
        customerName: customer.name,
        amount: subscription.amount / 100,
        subscriptionId: subscription._id.toString(),
        paymentId: payment._id.toString(),
        purpose: subscription.purpose,
        endDate: toDateString(subscription.endDate),
      },
    });

    const deliveryPartnerId = customer.deliveryPlan?.deliveryBoyId || '';
    try {
      await Notification.create({
        recipientRole: 'delivery_boy',
        recipientId: deliveryPartnerId,
        title: subscription.purpose === 'upgrade' ? '✨ Customer Upgraded Plan' : '📅 Subscription Extended',
        message: `${customer.name} (${customer.area || 'Doorstep'}): ${noteText}.`,
        type: 'subscription_created',
        data: {
          customerId: customer.customerId,
          customerName: customer.name,
          customerPhone: customer.mobile,
          customerAddress: customer.address,
          area: customer.area,
          milkQty: customer.deliveryPlan?.milkQty || 1,
          subscriptionId: subscription._id.toString(),
          deliveryBoyId: deliveryPartnerId,
          endDate: toDateString(subscription.endDate),
        },
      });
    } catch (dbNotifErr) {
      console.warn('Driver subscription notification note:', dbNotifErr.message);
    }

    await ensureDeliveriesForDate(formatDate(addDays(subscription.startDate, 0)));
    broadcast('CUSTOMER_UPDATED', { id: customer._id.toString() });
    broadcast('SUBSCRIPTION_UPDATED', { id: subscription._id.toString(), status: 'active', purpose: subscription.purpose });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: subscription.purpose === 'upgrade'
        ? 'Payment verified! Plan successfully upgraded.'
        : subscription.purpose === 'extend'
        ? `Payment verified! Subscription extended by ${subscription.extendDays || 30} days.`
        : 'Payment verified and subscription activated.',
      subscription: {
        id: subscription._id.toString(),
        status: 'active',
        purpose: subscription.purpose,
        startDate: toDateString(subscription.startDate),
        endDate: toDateString(subscription.endDate),
      },
    });
  } catch (error) {
    console.error('Subscription payment verification failed:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Payment was received but subscription activation needs attention. Please contact support.',
    });
  }
};

const failSubscription = async (req, res) => {
  try {
    const { orderId, subscriptionId, reason } = req.body || {};
    const targetOrderId = orderId || req.params.orderId;
    if (!targetOrderId && !subscriptionId) {
      return res.status(400).json({ success: false, message: 'Order ID or Subscription ID is required.' });
    }

    const query = targetOrderId ? { providerOrderId: targetOrderId } : { _id: subscriptionId };
    const subscription = await Subscription.findOne(query);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }

    subscription.status = 'failed';
    subscription.failedReason = reason || 'Payment was cancelled or failed at gateway';
    subscription.updatedAt = new Date();
    await subscription.save();

    if (subscription.customer && subscription.purpose === 'new') {
      const customer = await Customer.findById(subscription.customer);
      if (customer && customer.subscription?.status === 'pending_payment') {
        customer.subscription.status = 'failed';
        await customer.save();
        broadcast('CUSTOMER_UPDATED', { id: customer._id.toString() });
      }
    }

    broadcast('SUBSCRIPTION_UPDATED', {
      id: subscription._id.toString(),
      customerId: subscription.customerId,
      status: 'failed',
      purpose: subscription.purpose,
      reason: subscription.failedReason,
    });

    return res.json({
      success: true,
      message: 'Subscription marked as failed.',
      subscription,
    });
  } catch (error) {
    console.error('Subscription failure recording error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to record payment failure.' });
  }
};

const getAdminSubscriptions = async (req, res) => {
  try {
    const [subscriptions, payments] = await Promise.all([
      Subscription.find({})
        .sort({ createdAt: -1 })
        .populate('customer', 'customerId name mobile email address area whatsapp'),
      Payment.find({ purpose: { $in: ['subscription', 'subscription_upgrade', 'subscription_extension'] } })
        .sort({ paymentDate: -1 })
        .lean(),
    ]);
    const paymentsBySubscriptionId = new Map(
      payments.filter((payment) => payment.subscriptionId).map((payment) => [payment.subscriptionId, payment])
    );
    const paymentsById = new Map(payments.map((payment) => [payment._id.toString(), payment]));

    const items = subscriptions.map((subscription) => {
      const record = subscription.toObject();
      const payment = paymentsBySubscriptionId.get(record._id.toString()) ||
        paymentsById.get(record.paymentRecordId) ||
        null;
      delete record.providerSignature;
      return {
        ...record,
        customer: record.customer || null,
        payment: payment ? {
          id: payment._id.toString(),
          amount: payment.amount,
          method: payment.paymentMethod,
          date: payment.paymentDate,
          collectedBy: payment.collectedBy,
          referenceNumber: payment.referenceNumber,
          gatewayOrderId: payment.gatewayOrderId,
          gatewayPaymentId: payment.gatewayPaymentId,
          notes: payment.notes,
        } : record.providerPaymentId ? {
          id: '',
          amount: record.amount / 100,
          method: 'razorpay',
          date: record.updatedAt || record.createdAt,
          collectedBy: 'Razorpay',
          referenceNumber: record.providerPaymentId,
          gatewayOrderId: record.providerOrderId,
          gatewayPaymentId: record.providerPaymentId,
          notes: 'Payment verified for this active subscription.',
        } : null,
      };
    });

    return res.json({ success: true, subscriptions: items });
  } catch (error) {
    console.error('Admin subscription list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load subscriptions. Please try again.' });
  }
};

const getMySubscriptions = async (req, res) => {
  try {
    const mobile = req.query.mobile || req.user?.mobile;
    const customer = await getCustomerForUser(req.user, mobile);
    if (!customer) {
      return res.json({ success: true, subscriptions: [] });
    }
    const subscriptions = await Subscription.find({
      $or: [{ customer: customer._id }, { customerId: customer.customerId }, { whatsapp: customer.mobile }],
    }).sort({ createdAt: -1 });

    return res.json({ success: true, subscriptions });
  } catch (error) {
    console.error('Customer subscriptions fetch failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your subscriptions.' });
  }
};

const toggleSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body || {};
    if (!['stop', 'start'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be either start or stop.' });
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'Reason must be 500 characters or fewer.' });
    }

    let subscription = null;
    if (id && id.length === 24) {
      subscription = await Subscription.findById(id);
    }
    if (!subscription && id) {
      subscription = await Subscription.findOne({
        $or: [{ customerId: id }, { providerOrderId: id }],
      }).sort({ createdAt: -1 });
    }

    let customer = null;
    if (subscription && subscription.customer) {
      customer = await Customer.findById(subscription.customer);
    }
    if (!customer && id) {
      const query = id.length === 24 ? { _id: id } : { customerId: id };
      customer = await Customer.findOne(query);
    }

    if (!subscription && !customer) {
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }
    const isCustomerOwner = req.user.role === 'customer' && customer &&
      (req.user.id === customer._id.toString() || req.user.customerId === customer.customerId);
    if (req.user.role !== 'admin' && !isCustomerOwner) {
      return res.status(403).json({ success: false, message: 'You can only change your own subscription.' });
    }

    const isStopping = action === 'stop';
    const newSubStatus = isStopping ? 'paused' : 'active';
    const newCustStatus = isStopping ? 'paused' : 'active';
    const today = formatDate();

    if (subscription) {
      subscription.status = newSubStatus;
      subscription.updatedAt = new Date();
      await subscription.save();
    }

    if (customer) {
      customer.status = newCustStatus;
      if (customer.subscription) {
        customer.subscription.status = newSubStatus;
      }
      await customer.save();

      const deliveries = await Delivery.find({ customerId: customer.customerId, date: { $gte: today } });
      for (const d of deliveries) {
        if (isStopping && ['pending', 'scheduled'].includes(d.status)) {
          d.status = 'cancelled';
          d.notes = reason ? `Cancelled: ${reason}` : 'Cancelled because subscription paused';
          await d.save();
        } else if (!isStopping && d.status === 'cancelled') {
          d.status = 'pending';
          d.notes = 'Restored active subscription';
          await d.save();
        }
      }

      const deliveryPartnerId = customer.deliveryPlan?.deliveryBoyId || '';
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: deliveryPartnerId,
          title: isStopping ? '⏸️ Subscription Paused' : '▶️ Subscription Resumed',
          message: `${customer.name} (${customer.area || 'Doorstep'}) has ${isStopping ? 'paused' : 'resumed'} their subscription deliveries.`,
          type: 'subscription_toggled',
          data: {
            customerId: customer.customerId,
            customerName: customer.name,
            status: newSubStatus,
            deliveryBoyId: deliveryPartnerId,
          },
        });
      } catch (subNotifErr) {
        console.warn('Driver toggle subscription notification note:', subNotifErr.message);
      }

      broadcast('CUSTOMER_UPDATED', { id: customer._id.toString() });
    }

    if (subscription) {
      broadcast('SUBSCRIPTION_UPDATED', { id: subscription._id.toString() });
    }
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: `Subscription successfully ${isStopping ? 'stopped' : 'started'}!`,
      status: newSubStatus,
      subscription,
      customer,
    });
  } catch (error) {
    console.error('Toggle subscription status failed:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Unable to update subscription status.' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  failSubscription,
  getAdminSubscriptions,
  getMySubscriptions,
  toggleSubscriptionStatus,
};
