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

const getCustomerForUser = async (user) => {
  let customer = null;
  if (user.id && /^[a-f\d]{24}$/i.test(user.id)) {
    customer = await Customer.findById(user.id);
  }
  if (!customer && user.mobile) customer = await Customer.findOne({ mobile: user.mobile });
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
    const { address, area, landmark = '', whatsapp = '' } = req.body;
    if (typeof address !== 'string' || !address.trim() || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery address and area are required.' });
    }
    const plan = normalizePlan(req.body);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Choose a valid milk or curd quantity and delivery schedule.' });
    }

    let customer = await getCustomerForUser(req.user);
    if (!customer) {
      const mobile = (req.user.mobile || '').trim();
      if (!mobile) {
        return res.status(400).json({ success: false, message: 'Your account needs a registered mobile number before subscribing.' });
      }
      const count = await Customer.countDocuments();
      customer = await Customer.create({
        customerId: `CUST-${count + 101}`,
        name: req.user.name || 'Customer',
        mobile,
        whatsapp: mobile,
        address: address.trim(),
        area: area.trim(),
        status: 'inactive',
        subscription: { status: 'pending_payment' },
        deliveryPlan: { milkQty: 0, curdQty: 0, frequency: 'daily', deliveryDays: [] },
        paymentInfo: { paymentType: 'prepaid', paymentCycle: 'monthly' },
        notes: 'Customer account created during subscription checkout',
      });
    }

    if (customer.mobile !== req.user.mobile) {
      return res.status(403).json({ success: false, message: 'This subscription does not belong to the signed-in account.' });
    }
    if (customer.subscription?.status === 'active' &&
        customer.subscription.endDate &&
        toDateString(customer.subscription.endDate) >= formatDate()) {
      return res.status(409).json({ success: false, message: 'Your subscription is already active.' });
    }

    const pendingOrder = await Subscription.findOne({ customer: customer._id, status: 'pending' });
    if (pendingOrder) {
      const samePlan = pendingOrder.plan.milkQty === plan.milkQty &&
        pendingOrder.plan.curdQty === plan.curdQty &&
        pendingOrder.plan.frequency === plan.frequency &&
        pendingOrder.plan.deliveryDays.join(',') === plan.deliveryDays.join(',');
      const sameAddress = pendingOrder.deliveryAddress === address.trim() &&
        pendingOrder.area === area.trim() &&
        pendingOrder.landmark === (typeof landmark === 'string' ? landmark.trim() : '') &&
        pendingOrder.whatsapp === (typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : customer.mobile);
      if (!samePlan || !sameAddress) {
        return res.status(409).json({
          success: false,
          message: 'A payment checkout for another plan is still pending. Complete or cancel that checkout before changing your subscription.',
        });
      }
      const order = await razorpayRequest(`/orders/${encodeURIComponent(pendingOrder.providerOrderId)}`, 'GET');
      if (order.status !== 'created') {
        return res.status(409).json({ success: false, message: 'This checkout has already been processed. Refresh your subscription status or contact support.' });
      }
      return res.json({
        success: true,
        order: { id: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID },
        subscription: {
          id: pendingOrder._id.toString(),
          startDate: toDateString(pendingOrder.startDate),
          endDate: toDateString(pendingOrder.endDate),
        },
      });
    }

    const startDate = startOfLocalDay(new Date());
    const endDate = startOfLocalDay(addDays(startDate, SUBSCRIPTION_DAYS - 1));
    const amount = estimateSubscriptionAmount(plan, startDate);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'The selected plan has no scheduled deliveries in its first 30 days.' });
    }

    const order = await razorpayRequest('/orders', 'POST', {
      amount,
      currency: 'INR',
      receipt: `sub_${customer._id.toString().slice(-18)}_${Date.now()}`,
      notes: { customerId: customer.customerId, planDays: String(SUBSCRIPTION_DAYS) },
    });

    const subscription = await Subscription.create({
      customer: customer._id,
      customerId: customer.customerId,
      customerName: customer.name,
      status: 'pending',
      providerOrderId: order.id,
      amount,
      currency: 'INR',
      plan,
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
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      subscription: {
        id: subscription._id.toString(),
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
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if ([orderId, paymentId, signature].some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ success: false, message: 'Razorpay payment verification details are incomplete.' });
    }

    const subscription = await Subscription.findOne({ providerOrderId: orderId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription checkout was not found.' });
    }
    const customer = await getCustomerForUser(req.user);
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
    if (subscription.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'This subscription checkout has already been processed.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(signature);
    if (!process.env.RAZORPAY_KEY_SECRET ||
        expectedBuffer.length !== providedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return res.status(400).json({ success: false, message: 'Payment signature could not be verified.' });
    }

    let gatewayPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, 'GET');
    if (gatewayPayment.order_id !== orderId ||
        gatewayPayment.amount !== subscription.amount ||
        gatewayPayment.currency !== subscription.currency) {
      return res.status(400).json({ success: false, message: 'The payment is not captured for this subscription order.' });
    }
    if (gatewayPayment.status === 'authorized') {
      gatewayPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, 'POST', {
        amount: subscription.amount,
        currency: subscription.currency,
      });
    }
    if (gatewayPayment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'The payment has not been captured for this subscription order.' });
    }

    let payment = await Payment.findOne({ gatewayPaymentId: paymentId });
    if (!payment) {
      payment = await Payment.create({
        customerId: customer.customerId,
        customerName: customer.name,
        amount: subscription.amount / 100,
        paymentMethod: 'razorpay',
        purpose: 'subscription',
        subscriptionId: subscription._id.toString(),
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        paymentDate: new Date(),
        collectedBy: 'Razorpay',
        referenceNumber: paymentId,
        previousBalance: customer.currentBalance || 0,
        newBalance: customer.currentBalance || 0,
        notes: `30-day prepaid subscription (${toDateString(subscription.startDate)} to ${toDateString(subscription.endDate)})`,
      });
    }

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
      paymentId: paymentId,
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

    subscription.status = 'active';
    subscription.providerPaymentId = paymentId;
    subscription.providerSignature = signature;
    subscription.paymentRecordId = payment._id.toString();
    subscription.updatedAt = new Date();
    await subscription.save();

    await Notification.create({
      recipientRole: 'admin',
      title: 'New Paid Subscription',
      message: `${customer.name} started a 30-day subscription. Payment of ₹${(subscription.amount / 100).toFixed(2)} is confirmed.`,
      type: 'subscription_created',
      data: {
        customerId: customer.customerId,
        customerName: customer.name,
        amount: subscription.amount / 100,
        subscriptionId: subscription._id.toString(),
        paymentId: payment._id.toString(),
        endDate: toDateString(subscription.endDate),
      },
    });

    // Notify delivery partner about new active subscription
    const deliveryPartnerId = customer.deliveryPlan?.deliveryBoyId || '';
    try {
      await Notification.create({
        recipientRole: 'delivery_boy',
        recipientId: deliveryPartnerId,
        title: '🌟 New Active Subscription',
        message: `${customer.name} (${customer.deliveryPlan?.milkQty || 1}L Daily Milk, ${customer.area || 'Madhapur'}) has started an active prepaid subscription through ${toDateString(subscription.endDate)}.`,
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
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: 'Payment verified and subscription activated.',
      subscription: {
        status: 'active',
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

const getAdminSubscriptions = async (req, res) => {
  try {
    const [subscriptions, payments] = await Promise.all([
      Subscription.find({})
        .sort({ createdAt: -1 })
        .populate('customer', 'customerId name mobile email address area whatsapp'),
      Payment.find({ purpose: 'subscription' }).sort({ paymentDate: -1 }).lean(),
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
    const customer = await getCustomerForUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found.' });
    }
    const subscriptions = await Subscription.find({
      $or: [{ customer: customer._id }, { customerId: customer.customerId }],
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
    const actor = req.user.name || req.user.role;
    if (!['stop', 'start'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be either start or stop.' });
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'Reason must be 500 characters or fewer.' });
    }

    // Look up subscription by _id, or by customerId, or providerOrderId
    let subscription = null;
    if (id && id.length === 24) {
      subscription = await Subscription.findById(id);
    }
    if (!subscription && id) {
      subscription = await Subscription.findOne({
        $or: [{ customerId: id }, { providerOrderId: id }],
      }).sort({ createdAt: -1 });
    }

    // Determine target customer
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
      if (isStopping) {
        customer.pauseFrom = today;
        customer.pauseUntil = null;
        if (customer.subscription) {
          customer.subscription.status = 'paused';
        }
        if (reason) customer.notes = `${customer.notes ? customer.notes + ' | ' : ''}Stopped: ${reason}`;
      } else {
        customer.pauseFrom = null;
        customer.pauseUntil = null;
        if (customer.subscription) {
          customer.subscription.status = 'active';
        }
      }
      await customer.save();

      if (isStopping) {
        await Delivery.updateMany(
          {
            $or: [
              { customerId: customer._id.toString() },
              { customerId: customer.customerId },
              { customerPhone: customer.mobile },
            ],
            deliveryDate: { $gte: today },
            status: 'pending',
          },
          {
            $set: {
              status: 'not_delivered',
              notDeliveredReason: reason || `Subscription stopped by ${actor || 'Admin'}`,
            },
          }
        );
      } else {
        await Delivery.updateMany(
          {
            $or: [
              { customerId: customer._id.toString() },
              { customerId: customer.customerId },
              { customerPhone: customer.mobile },
            ],
            deliveryDate: { $gte: today },
            status: 'not_delivered',
            notDeliveredReason: { $regex: /Paused|Vacation|Stopped/i },
          },
          {
            $set: {
              status: 'pending',
              notDeliveredReason: '',
            },
          }
        );
        await ensureDeliveriesForDate(today);
      }

      // Notify delivery partner about subscription state toggle
      const deliveryPartnerId = customer?.deliveryPlan?.deliveryBoyId || '';
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: deliveryPartnerId,
          title: isStopping ? '⏸️ Subscription Paused' : '▶️ Subscription Resumed',
          message: `${customer.name}'s daily subscription was ${isStopping ? 'paused' : 'resumed'}.${reason ? ' Reason: ' + reason : ''}`,
          type: 'route_update',
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
  getAdminSubscriptions,
  getMySubscriptions,
  toggleSubscriptionStatus,
};
