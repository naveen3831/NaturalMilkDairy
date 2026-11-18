const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');
const DeliveryLocation = require('../models/DeliveryLocation');
const DeliveryBoy = require('../models/DeliveryBoy');

const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (d = new Date()) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
};

const ensureDeliveriesForDate = async (dateStr = formatDate()) => {
  try {
    const targetDate = new Date(dateStr + 'T00:00:00');
    const dayName = getDayName(targetDate);
    const dayNumber = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));

    // Fetch all active delivery locations configured by admin
    const activeLocations = await DeliveryLocation.find({ isActive: true }).lean().catch(() => []);
    const activeLocationSet = new Set(activeLocations.map((l) => l.name.toLowerCase().trim()));

    const customers = await Customer.find({ status: { $ne: 'inactive' } }).lean();

    // Cache active delivery partners to auto-assign territory drops
    const allBoys = await DeliveryBoy.find().lean().catch(() => []);

    for (const customer of customers) {
      const custArea = (customer.area || '').toLowerCase().trim();
      const plan = customer.deliveryPlan || {};
      const subscription = customer.subscription;

      // STRICT REQUIREMENT: Only customers with an active subscription or explicit subscribed plan receive deliveries!
      const hasActiveSub = subscription?.status === 'active' || plan.isSubscribed === true;
      if (!hasActiveSub) {
        continue;
      }

      if (subscription?.status === 'pending_payment' || subscription?.status === 'expired' ||
          subscription?.status === 'cancelled') {
        continue;
      }
      if (subscription?.status === 'active' && subscription.endDate &&
          formatDate(new Date(subscription.endDate)) < dateStr) {
        if (formatDate(new Date(subscription.endDate)) < formatDate() &&
            dateStr >= formatDate()) {
          await Customer.updateOne(
            { _id: customer._id, 'subscription.status': 'active' },
            { $set: { 'subscription.status': 'expired' } }
          );
        }
        continue;
      }
      if (subscription?.status === 'active' && subscription.startDate &&
          formatDate(new Date(subscription.startDate)) > dateStr &&
          dateStr !== formatDate()) {
        continue;
      }

      // Check pause
      if (customer.status === 'paused') {
        continue;
      }

      // Check delivery plan schedule
      let shouldDeliver = false;

      if (plan.frequency === 'daily' || !plan.frequency) {
        shouldDeliver = true;
      } else if (plan.frequency === 'alternate') {
        shouldDeliver = dayNumber % 2 === 0;
      } else if (plan.frequency === 'selected' || plan.frequency === 'custom') {
        shouldDeliver = Array.isArray(plan.deliveryDays) && plan.deliveryDays.includes(dayName);
      }

      if (!shouldDeliver) continue;

      const custId = customer.customerId || customer._id.toString();

      // Check if delivery already exists in MongoDB
      const existing = await Delivery.findOne({
        $or: [
          { customerId: custId },
          { customerId: customer._id.toString() },
          ...(customer.customerId ? [{ customerId: customer.customerId }] : []),
        ],
        deliveryDate: dateStr,
      });

      if (!existing) {
        let milkQty = plan.milkQty || 1;
        let curdQty = plan.curdQty || 0;

        if (customer.temporaryQty && customer.temporaryQty.date === dateStr) {
          if (customer.temporaryQty.milkQty !== null && customer.temporaryQty.milkQty !== undefined) {
            milkQty = customer.temporaryQty.milkQty;
          }
          if (customer.temporaryQty.curdQty !== null && customer.temporaryQty.curdQty !== undefined) {
            curdQty = customer.temporaryQty.curdQty;
          }
        }

        const milkPrice = 60;
        const curdPrice = 30;
        const extraItems = Array.isArray(plan.extraProducts) ? plan.extraProducts : [];
        let extraTotal = 0;
        for (const itm of extraItems) {
          extraTotal += (Number(itm.price) || 0) * (Number(itm.quantity) || 1);
        }
        const totalAmount = milkQty * milkPrice + (curdQty / 500) * curdPrice + extraTotal;
        const paymentType = customer.paymentInfo?.paymentType || 'credit';

        let driverId = plan.deliveryBoyId || '';
        let driverName = plan.deliveryBoyName || '';

        // Auto-assign route driver if unassigned
        if (!driverId && allBoys.length > 0) {
          const matched = allBoys.find((b) =>
            (b.area && custArea && (b.area.toLowerCase().includes(custArea) || custArea.includes(b.area.toLowerCase()))) ||
            (b.area && b.area.toLowerCase() === 'madhapur') ||
            (b.name && b.name.toLowerCase().includes('naveen'))
          ) || allBoys[0];

          if (matched) {
            driverId = matched._id.toString();
            driverName = matched.name;
            await Customer.updateOne(
              { _id: customer._id },
              { $set: { 'deliveryPlan.deliveryBoyId': driverId, 'deliveryPlan.deliveryBoyName': driverName } }
            );
          }
        }

        await Delivery.create({
          customerId: custId,
          customerName: customer.name,
          customerPhone: customer.mobile,
          customerAddress: customer.address,
          latitude: customer.latitude || null,
          longitude: customer.longitude || null,
          customerLatitude: customer.latitude || customer.customerLatitude || null,
          customerLongitude: customer.longitude || customer.customerLongitude || null,
          deliveryBoyId: driverId,
          deliveryBoyName: driverName,
          deliveryDate: dateStr,
          plannedMilk: milkQty,
          plannedCurd: curdQty,
          actualMilk: milkQty,
          actualCurd: curdQty,
          extraItems,
          milkPrice,
          curdPrice,
          totalAmount,
          status: 'pending',
          notDeliveredReason: '',
          paymentStatus: paymentType === 'prepaid' ? 'advance' : 'credit',
          paymentAmount: 0,
          paymentMethod: paymentType === 'prepaid' ? 'advance' : 'credit',
          subscriptionEndDate: customer.subscription?.status === 'active' ? customer.subscription.endDate : null,
          subscriptionPaymentAmount: customer.subscription?.status === 'active' ? customer.subscription.amount : 0,
          subscriptionPaymentMethod: customer.subscription?.status === 'active' ? 'razorpay' : '',
          subscriptionPaymentId: customer.subscription?.status === 'active' ? customer.subscription.paymentId : '',
          notes: customer.notes || '',
          deliveredAt: null,
          createdAt: new Date(),
        });
      } else {
        // Sync assigned delivery boy to existing pending delivery if it was unassigned
        let syncNeeded = false;
        let driverId = plan.deliveryBoyId || '';
        let driverName = plan.deliveryBoyName || '';

        if (!driverId && allBoys.length > 0) {
          const matched = allBoys.find((b) =>
            (b.area && custArea && (b.area.toLowerCase().includes(custArea) || custArea.includes(b.area.toLowerCase()))) ||
            (b.area && b.area.toLowerCase() === 'madhapur') ||
            (b.name && b.name.toLowerCase().includes('naveen'))
          ) || allBoys[0];

          if (matched) {
            driverId = matched._id.toString();
            driverName = matched.name;
            await Customer.updateOne(
              { _id: customer._id },
              { $set: { 'deliveryPlan.deliveryBoyId': driverId, 'deliveryPlan.deliveryBoyName': driverName } }
            );
          }
        }

        if ((!existing.deliveryBoyId || existing.deliveryBoyId !== driverId) && driverId) {
          existing.deliveryBoyId = driverId;
          existing.deliveryBoyName = driverName;
          syncNeeded = true;
        }
        if (syncNeeded) {
          await existing.save();
        }
      }
    }
  } catch (err) {
    console.error('ensureDeliveriesForDate note:', err.message);
  }
};

const ensureDeliveriesForRange = async (startDateStr, endDateStr) => {
  try {
    if (!startDateStr || !endDateStr) return;
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    let cur = new Date(start);
    let count = 0;
    while (cur <= end && count < 60) {
      await ensureDeliveriesForDate(formatDate(cur));
      cur.setDate(cur.getDate() + 1);
      count++;
    }
  } catch (err) {
    console.error('ensureDeliveriesForRange note:', err.message);
  }
};

const customerEnsureCache = new Map();
let lastEnsureAllTime = 0;

const ensureDeliveriesForCustomer = async (customer, force = false) => {
  if (!customer) return;
  // If customer is not actively subscribed, DO NOT generate deliveries!
  const hasActiveSub = customer.subscription?.status === 'active' || customer.deliveryPlan?.isSubscribed === true;
  if (!hasActiveSub) {
    return;
  }
  try {
    const custId = customer.customerId || customer._id.toString();
    const now = Date.now();
    if (!force && customerEnsureCache.has(custId) && (now - customerEnsureCache.get(custId) < 5 * 60 * 1000)) {
      return;
    }
    customerEnsureCache.set(custId, now);

    const todayStr = formatDate();
    const plan = customer.deliveryPlan || {};
    const subscription = customer.subscription;
    const cleanPhone = String(customer.mobile || '').replace(/\D/g, '').slice(-10);

    // Determine start date
    let startStr = null;
    if (subscription?.startDate) {
      startStr = formatDate(new Date(subscription.startDate));
    } else if (customer.createdAt) {
      startStr = formatDate(new Date(customer.createdAt));
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startStr = formatDate(d);
    }

    // Check if there is an earlier delivery already recorded in DB
    const earliestDel = await Delivery.findOne({
      $or: [
        { customerId: custId },
        { customerId: customer._id.toString() },
        ...(customer.customerId ? [{ customerId: customer.customerId }] : []),
        ...(cleanPhone ? [{ customerPhone: new RegExp(cleanPhone + '$') }] : []),
      ],
    }).sort({ deliveryDate: 1 }).select('deliveryDate').lean();

    if (earliestDel?.deliveryDate && earliestDel.deliveryDate < startStr) {
      startStr = earliestDel.deliveryDate;
    }

    // Determine end date: at least today, or subscription.endDate, or today + 7 days
    let endStr = todayStr;
    if (subscription?.endDate) {
      const subEndStr = formatDate(new Date(subscription.endDate));
      if (subEndStr > endStr) endStr = subEndStr;
    }

    // Safety guard: max 90 days back
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = formatDate(ninetyDaysAgo);
    if (startStr < ninetyDaysAgoStr) {
      startStr = ninetyDaysAgoStr;
    }

    if (startStr > endStr) return;

    // Get all existing delivery dates in range
    const existing = await Delivery.find({
      $or: [
        { customerId: custId },
        { customerId: customer._id.toString() },
        ...(customer.customerId ? [{ customerId: customer.customerId }] : []),
        ...(cleanPhone ? [{ customerPhone: new RegExp(cleanPhone + '$') }] : []),
      ],
      deliveryDate: { $gte: startStr, $lte: endStr },
    }).select('deliveryDate').lean();

    const existingDates = new Set(existing.map((e) => e.deliveryDate));

    // Resolve delivery boy
    let driverId = plan.deliveryBoyId || '';
    let driverName = plan.deliveryBoyName || '';
    const allBoys = await DeliveryBoy.find().lean().catch(() => []);
    const custArea = (customer.area || '').toLowerCase().trim();

    if (!driverId && allBoys.length > 0) {
      const matched = allBoys.find((b) =>
        (b.area && custArea && (b.area.toLowerCase().includes(custArea) || custArea.includes(b.area.toLowerCase()))) ||
        (b.area && b.area.toLowerCase() === 'madhapur') ||
        (b.name && b.name.toLowerCase().includes('naveen'))
      ) || allBoys[0];
      if (matched) {
        driverId = matched._id.toString();
        driverName = matched.name;
      }
    }

    const milkQty = plan.milkQty || 1;
    const curdQty = plan.curdQty || 0;
    const milkPrice = 60;
    const curdPrice = 30;
    const extraItems = Array.isArray(plan.extraProducts) ? plan.extraProducts : [];
    let extraTotal = 0;
    for (const item of extraItems) {
      extraTotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }
    const totalAmount = milkQty * milkPrice + (curdQty / 500) * curdPrice + extraTotal;
    const paymentType = customer.paymentInfo?.paymentType || (subscription?.status === 'active' ? 'prepaid' : 'credit');

    const toInsert = [];
    const cur = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    while (cur <= end) {
      const dStr = formatDate(cur);
      if (!existingDates.has(dStr)) {
        const dayName = getDayName(cur);
        const dayNumber = Math.floor(cur.getTime() / (1000 * 60 * 60 * 24));

        let shouldDeliver = false;
        if (plan.frequency === 'daily' || !plan.frequency) {
          shouldDeliver = true;
        } else if (plan.frequency === 'alternate') {
          shouldDeliver = dayNumber % 2 === 0;
        } else if (plan.frequency === 'selected' || plan.frequency === 'custom') {
          shouldDeliver = Array.isArray(plan.deliveryDays) && plan.deliveryDays.includes(dayName);
        }

        // Check pause
        if (customer.status === 'paused') shouldDeliver = false;
        if (customer.pauseFrom && customer.pauseUntil && dStr >= customer.pauseFrom && dStr <= customer.pauseUntil) {
          shouldDeliver = false;
        }

        // Realtime data integrity: Only schedule pending deliveries for today or future dates.
        // Never fabricate past deliveries as 'delivered' for dates that were not physically recorded.
        if (shouldDeliver && dStr >= todayStr) {
          const status = 'pending';

          toInsert.push({
            customerId: custId,
            customerName: customer.name,
            customerPhone: customer.mobile,
            customerAddress: customer.address,
            latitude: customer.latitude || null,
            longitude: customer.longitude || null,
            customerLatitude: customer.latitude || customer.customerLatitude || null,
            customerLongitude: customer.longitude || customer.customerLongitude || null,
            deliveryBoyId: driverId,
            deliveryBoyName: driverName,
            deliveryDate: dStr,
            plannedMilk: milkQty,
            plannedCurd: curdQty,
            actualMilk: milkQty,
            actualCurd: curdQty,
            extraItems,
            milkPrice,
            curdPrice,
            totalAmount,
            status,
            notDeliveredReason: '',
            paymentStatus: isPrepaid ? 'advance' : 'credit',
            paymentAmount: 0,
            paymentMethod: isPrepaid ? 'advance' : 'credit',
            subscriptionEndDate: subscription?.status === 'active' ? subscription.endDate : null,
            subscriptionPaymentAmount: subscription?.status === 'active' ? subscription.amount : 0,
            subscriptionPaymentMethod: subscription?.status === 'active' ? 'razorpay' : '',
            subscriptionPaymentId: subscription?.status === 'active' ? subscription.paymentId : '',
            notes: customer.notes || '',
            deliveredAt: status === 'delivered' ? new Date(dStr + 'T06:15:00.000Z') : null,
            createdAt: new Date(),
          });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (toInsert.length > 0) {
      await Delivery.insertMany(toInsert);
    }
  } catch (err) {
    console.error('ensureDeliveriesForCustomer error:', err.message);
  }
};

const ensureAllDeliveries = async (force = false) => {
  try {
    const now = Date.now();
    if (!force && (now - lastEnsureAllTime < 10 * 60 * 1000)) {
      return;
    }
    lastEnsureAllTime = now;

    const todayStr = formatDate();
    await ensureDeliveriesForDate(todayStr);

    const customers = await Customer.find({ status: { $ne: 'inactive' } }).lean();
    for (const c of customers) {
      await ensureDeliveriesForCustomer(c);
    }
  } catch (err) {
    console.error('ensureAllDeliveries error:', err.message);
  }
};

module.exports = {
  ensureDeliveriesForDate,
  ensureDeliveriesForRange,
  ensureDeliveriesForCustomer,
  ensureAllDeliveries,
  formatDate,
  getDayName,
};

