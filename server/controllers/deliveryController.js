const Delivery = require('../models/Delivery');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { recordAudit } = require('../services/auditService');
const { ensureDeliveriesForDate, ensureDeliveriesForRange, formatDate } = require('../services/deliveryService');
const { broadcast } = require('../config/websocket');

const isPersistedProof = (proofImage) => {
  const proofUrl = typeof proofImage === 'string' ? proofImage.trim() : '';
  if (proofUrl.length > 2048) return false;

  if (/^\/uploads\/[a-z0-9_.-]+$/i.test(proofUrl)) {
    const fs = require('fs');
    const path = require('path');
    return fs.existsSync(path.join(__dirname, '../uploads', path.basename(proofUrl)));
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  try {
    const proofUrlObject = new URL(proofUrl);
    return proofUrlObject.protocol === 'https:' &&
      proofUrlObject.hostname === 'res.cloudinary.com' &&
      proofUrlObject.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
  } catch (error) {
    return false;
  }
};

const canManageDelivery = (user, delivery) => {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'delivery_boy') return false;
  const identityMatches = [user.id, user.boyId, user.mobile].filter(Boolean)
    .includes(delivery.deliveryBoyId);
  const nameMatches = user.name && delivery.deliveryBoyName &&
    user.name.trim().toLowerCase() === delivery.deliveryBoyName.trim().toLowerCase();
  return Boolean(delivery.deliveryBoyId || delivery.deliveryBoyName) && (identityMatches || nameMatches);
};

// Get today's or selected date deliveries
const getDeliveries = async (req, res) => {
  try {
    const { status, deliveryBoyId, search, range = 'today', startDate, endDate } = req.query;
    const requestedDate = req.query.date;
    const todayStr = formatDate();
    const targetDate = requestedDate || todayStr;

    // Auto-generate scheduled deliveries in MongoDB for today
    await ensureDeliveriesForDate(todayStr);
    if (requestedDate && requestedDate !== 'all' && requestedDate !== todayStr) {
      await ensureDeliveriesForDate(requestedDate);
    }

    const filter = {
      deletedForAdmin: { $ne: true },
    };
    const andFilters = [];

    if (req.user?.role === 'delivery_boy') {
      filter.deletedForDriver = { $ne: true };
      const assignedIds = [req.user.id, req.user.boyId, req.user.mobile].filter(Boolean);
      const assignedNames = req.user.name ? [req.user.name] : [];
      const assignedFilter = [
        ...(assignedIds.length ? [{ deliveryBoyId: { $in: assignedIds } }] : []),
        ...(assignedNames.length ? [{ deliveryBoyName: { $in: assignedNames } }] : []),
      ];
      if (!assignedFilter.length) return res.json({ success: true, date: targetDate, summary: { total: 0, delivered: 0, pending: 0, notDelivered: 0 }, deliveries: [] });
      andFilters.push({ $or: assignedFilter });
    }

    // Apply date range filters
    if (range === 'all' || requestedDate === 'all') {
      // Show all deliveries across entire system
    } else if (range === 'weekly') {
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startStr = formatDate(monday);
      const endStr = formatDate(sunday);
      await ensureDeliveriesForRange(startStr, endStr);
      filter.deliveryDate = { $gte: startStr, $lte: endStr };
    } else if (range === 'monthly') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startStr = formatDate(firstDay);
      const endStr = formatDate(lastDay);
      await ensureDeliveriesForRange(startStr, endStr);
      filter.deliveryDate = { $gte: startStr, $lte: endStr };
    } else if (startDate && endDate) {
      await ensureDeliveriesForRange(startDate, endDate);
      filter.deliveryDate = { $gte: startDate, $lte: endDate };
    } else {
      filter.deliveryDate = targetDate;
    }

    if (req.user?.role !== 'delivery_boy' && deliveryBoyId && deliveryBoyId !== 'all') {
      const boyQuery = [
        ...(deliveryBoyId.length === 24 ? [{ _id: deliveryBoyId }] : []),
        { mobile: deliveryBoyId },
      ];
      let driverBoy = null;
      let driverUser = null;
      driverBoy = await DeliveryBoy.findOne({ $or: boyQuery }).lean();
      driverUser = await User.findOne({ $or: boyQuery }).lean();

      const possibleIds = [deliveryBoyId];
      if (driverBoy) {
        possibleIds.push(driverBoy._id.toString());
        if (driverBoy.mobile) possibleIds.push(driverBoy.mobile);
      }
      if (driverUser) {
        possibleIds.push(driverUser._id.toString());
        if (driverUser.mobile) possibleIds.push(driverUser.mobile);
      }

      const driverNames = [driverBoy?.name, driverUser?.name].filter(Boolean);

      andFilters.push({ $or: [
        { deliveryBoyId: { $in: possibleIds } },
        ...(driverNames.length > 0 ? [{ deliveryBoyName: { $in: driverNames } }] : []),
      ] });
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const q = search.trim().slice(0, 100).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      if (q) andFilters.push({ $or: [
        { customerName: { $regex: q, $options: 'i' } },
        { customerAddress: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
      ] });
    }
    if (andFilters.length) filter.$and = andFilters;

    const list = await Delivery.find(filter).sort({ deliveryDate: -1, customerName: 1 }).lean();

    const total = list.length;
    const delivered = list.filter((d) => d.status === 'delivered').length;
    const pending = list.filter((d) => d.status === 'pending').length;
    const notDelivered = list.filter((d) => d.status === 'not_delivered').length;

    return res.json({
      success: true,
      date: targetDate,
      summary: { total, delivered, pending, notDelivered },
      deliveries: list.map((d) => ({
        ...d,
        id: d._id.toString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getAssignedCustomers = async (req, res) => {
  try {
    const identityValues = [req.user?.id, req.user?.boyId, req.user?.mobile].filter(Boolean);
    const identityIds = identityValues.filter((value) => /^[a-f\d]{24}$/i.test(value));
    const identityMobiles = identityValues.filter((value) => !/^[a-f\d]{24}$/i.test(value));
    const partnerQueries = [];

    if (identityIds.length) partnerQueries.push({ _id: { $in: identityIds } });
    if (identityMobiles.length) partnerQueries.push({ mobile: { $in: identityMobiles } });

    const [deliveryBoy, user] = await Promise.all([
      partnerQueries.length ? DeliveryBoy.findOne({ $or: partnerQueries }).lean() : null,
      partnerQueries.length ? User.findOne({ $or: partnerQueries, role: 'delivery_boy' }).lean() : null,
    ]);
    const partnerIds = new Set(identityValues);
    const partnerNames = new Set([req.user?.name, deliveryBoy?.name, user?.name].filter(Boolean).map((name) => name.trim().toLowerCase()));
    const partnerMobiles = new Set([req.user?.mobile, deliveryBoy?.mobile, user?.mobile].filter(Boolean));

    if (deliveryBoy?._id) partnerIds.add(deliveryBoy._id.toString());
    if (user?._id) partnerIds.add(user._id.toString());
    partnerMobiles.forEach((mobile) => partnerIds.add(mobile));

    const assignmentFilters = [];
    if (partnerIds.size) assignmentFilters.push({ 'deliveryPlan.deliveryBoyId': { $in: [...partnerIds] } });
    if (partnerNames.size) assignmentFilters.push({ 'deliveryPlan.deliveryBoyName': { $in: [...partnerNames] } });
    if (partnerIds.size) assignmentFilters.push({ createdByDriverId: { $in: [...partnerIds] } });
    if (!assignmentFilters.length) {
      return res.json({ success: true, customers: [] });
    }

    const customers = await Customer.find({
      status: { $ne: 'inactive' },
      $or: assignmentFilters,
    }).sort({ createdAt: -1, name: 1 }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const assignedCustomers = customers.map((customer) => {
      const plan = customer.deliveryPlan || {};
      const subscription = customer.subscription || {};
      const startDate = subscription.startDate || plan.startDate || customer.createdAt;
      const endDate = subscription.status === 'active' ? subscription.endDate : null;
      let nextDeliveryDate = null;

      for (let offset = 0; offset < 90; offset += 1) {
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + offset);
        const scheduledDay = formatDate(scheduledDate);
        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledDate.getDay()];
        const dayNumber = Math.floor(scheduledDate.getTime() / (24 * 60 * 60 * 1000));
        const startsInTime = !startDate || formatDate(new Date(startDate)) <= scheduledDay;
        const endsInTime = !endDate || formatDate(new Date(endDate)) >= scheduledDay;
        const isPaused = customer.status === 'paused' || (customer.pauseFrom && customer.pauseUntil &&
          scheduledDay >= customer.pauseFrom && scheduledDay <= customer.pauseUntil);
        const matchesFrequency = plan.frequency === 'alternate'
          ? dayNumber % 2 === 0
          : ['selected', 'custom'].includes(plan.frequency)
            ? (plan.deliveryDays || []).includes(weekday)
            : true;

        if (startsInTime && endsInTime && !isPaused && matchesFrequency) {
          nextDeliveryDate = scheduledDay;
          break;
        }
      }

      return {
        id: customer._id.toString(),
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email || '',
        mobile: customer.mobile,
        whatsapp: customer.whatsapp || customer.mobile,
        address: customer.address,
        area: customer.area,
        landmark: customer.landmark || '',
        status: customer.status || 'active',
        pauseFrom: customer.pauseFrom || null,
        pauseUntil: customer.pauseUntil || null,
        currentBalance: customer.currentBalance || 0,
        paymentInfo: customer.paymentInfo || {},
        createdBy: customer.createdBy || 'admin',
        createdByDriverId: customer.createdByDriverId || '',
        createdByDriverName: customer.createdByDriverName || '',
        notes: customer.notes || '',
        createdAt: customer.createdAt,
        deliveryPlan: plan,
        subscription: {
          status: subscription.status || '',
          startDate: subscription.startDate || null,
          endDate: subscription.endDate || null,
          amount: subscription.amount || 0,
          paymentId: subscription.paymentId || '',
        },
        nextDeliveryDate,
      };
    });

    return res.json({ success: true, customers: assignedCustomers });
  } catch (error) {
    console.error('Assigned customer lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load assigned customers.' });
  }
};

// Mark delivery as Delivered
const markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      actualMilk,
      actualCurd,
      paymentMethod,
      notes,
      actor,
      collectedAmount,
      proofImage,
    } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    if (!canManageDelivery(req.user, delivery)) {
      return res.status(403).json({ success: false, message: 'Only the assigned delivery partner or an administrator can complete this delivery.' });
    }
    if (delivery.status === 'delivered') {
      return res.json({
        success: true,
        message: 'This delivery has already been completed.',
        delivery: { ...delivery.toObject(), id: delivery._id.toString() },
      });
    }

    const customer = await Customer.findOne({
      $or: [{ customerId: delivery.customerId }, { _id: delivery.customerId.length === 24 ? delivery.customerId : null }],
    });

    const proofUrl = typeof proofImage === 'string' ? proofImage.trim() : '';
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && process.env.REQUIRE_DELIVERY_PROOF === 'true' && !isPersistedProof(proofUrl)) {
      return res.status(400).json({
        success: false,
        message: 'A doorstep photo is required before completing delivery.',
      });
    }

    const milk = actualMilk !== undefined ? Number(actualMilk) : delivery.plannedMilk;
    const curd = actualCurd !== undefined ? Number(actualCurd) : delivery.plannedCurd;
    const milkPrice = delivery.milkPrice || 60;
    const curdPrice = delivery.curdPrice || 30;

    const totalAmount = milk * milkPrice + (curd / 500) * curdPrice;
    const activeSubscription = customer?.subscription?.status === 'active' &&
      customer.subscription.endDate &&
      formatDate(new Date(customer.subscription.endDate)) >= delivery.deliveryDate;
    const method = activeSubscription ? 'advance' : (paymentMethod || delivery.paymentMethod || 'credit');

    delivery.actualMilk = milk;
    delivery.actualCurd = curd;
    delivery.totalAmount = totalAmount;
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.paymentMethod = method;
    delivery.paymentStatus = activeSubscription ? 'paid' : (method === 'credit' ? 'credit' : 'paid');
    delivery.paymentAmount = activeSubscription ? 0 : delivery.paymentAmount;
    delivery.subscriptionEndDate = activeSubscription ? customer.subscription.endDate : delivery.subscriptionEndDate;
    delivery.proofImage = proofUrl;
    if (notes) delivery.notes = notes;
    await delivery.save();

    let newCustomerBalance = 0;

    if (customer) {
      if (method === 'credit') {
        customer.currentBalance += totalAmount;
        await customer.save();
        newCustomerBalance = customer.currentBalance;
      } else if (method === 'cash' || method === 'upi') {
        const paid = collectedAmount !== undefined ? Number(collectedAmount) : totalAmount;
        delivery.paymentAmount = paid;
        await delivery.save();

        const prevBal = customer.currentBalance;
        customer.currentBalance = prevBal + (totalAmount - paid);
        await customer.save();
        newCustomerBalance = customer.currentBalance;

        // Record Payment in MongoDB
        await Payment.create({
          customerId: customer.customerId || customer._id.toString(),
          customerName: customer.name,
          amount: paid,
          paymentMethod: method,
          paymentDate: new Date(),
          collectedBy: actor || delivery.deliveryBoyName || 'Delivery Boy',
          deliveryBoyId: delivery.deliveryBoyId,
          referenceNumber: `${method.toUpperCase()}-DELIVERY-${formatDate()}`,
          previousBalance: prevBal,
          newBalance: customer.currentBalance,
          notes: `Collected during delivery on ${delivery.deliveryDate}`,
          createdAt: new Date(),
        });

        // Update driver's daily cash
        if (delivery.deliveryBoyId) {
          const boyQuery = delivery.deliveryBoyId.length === 24 ? { _id: delivery.deliveryBoyId } : { mobile: delivery.deliveryBoyId };
          const boy = await DeliveryBoy.findOne(boyQuery);
          if (boy) {
            if (method === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + paid;
            if (method === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paid;
            await boy.save();
          }
        }
      } else if (method === 'advance' && !activeSubscription) {
        customer.currentBalance += totalAmount;
        await customer.save();
        newCustomerBalance = customer.currentBalance;
      }
    }

    await recordAudit(
      'Delivery Completed',
      actor || delivery.deliveryBoyName || 'Delivery Boy',
      `Delivered ${milk}L Milk + ${curd}g Curd to ${delivery.customerName} (₹${totalAmount} via ${method.toUpperCase()})`,
      'delivery'
    );

    // Send real-time notification to Admin
    try {
      await Notification.create({
        recipientRole: 'admin',
        title: '✅ Delivery Completed',
        message: `${actor || delivery.deliveryBoyName || 'Driver'} delivered ${milk}L Milk${curd > 0 ? ` + ${curd}g Curd` : ''} to ${delivery.customerName}. Collected: ₹${totalAmount} (${method.toUpperCase()}).`,
        type: 'delivery_completed',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          amount: totalAmount,
          method,
          driverName: delivery.deliveryBoyName || actor,
        },
      });
      if (customer) {
        await Notification.create({
          recipientRole: 'customer',
          recipientId: customer._id.toString(),
          title: 'Delivery Completed',
          message: `Your delivery for ${delivery.deliveryDate} is complete. View the doorstep photo proof in your delivery history.`,
          type: 'delivery_completed',
          data: { deliveryId: delivery._id.toString(), proofImage: delivery.proofImage },
        });
      }
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    broadcast('DELIVERY_UPDATED', { id: delivery._id.toString(), customerId: delivery.customerId });
    broadcast('CUSTOMER_UPDATED', { id: delivery.customerId, customerId: delivery.customerId });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: 'Delivery marked completed successfully',
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
      customerBalance: newCustomerBalance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mark delivery as Not Delivered
const markNotDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    if (!canManageDelivery(req.user, delivery)) {
      return res.status(403).json({ success: false, message: 'Only the assigned delivery partner or an administrator can update this delivery.' });
    }

    delivery.status = 'not_delivered';
    delivery.notDeliveredReason = reason || 'Customer Not Home';
    delivery.actualMilk = 0;
    delivery.actualCurd = 0;
    delivery.totalAmount = 0;
    delivery.deliveredAt = new Date();
    if (notes) delivery.notes = notes;
    await delivery.save();

    await recordAudit(
      'Delivery Marked Not Delivered',
      actor || delivery.deliveryBoyName || 'Delivery Boy',
      `${delivery.customerName} - Reason: ${delivery.notDeliveredReason}${notes ? ` (${notes})` : ''}`,
      'delivery'
    );

    // Send real-time notification to Admin
    try {
      await Notification.create({
        recipientRole: 'admin',
        title: '⚠️ Delivery Issue / Missed',
        message: `${actor || delivery.deliveryBoyName || 'Driver'} reported drop could not be completed for ${delivery.customerName}. Reason: ${delivery.notDeliveredReason}.`,
        type: 'delivery_missed',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          reason: delivery.notDeliveredReason,
          driverName: delivery.deliveryBoyName || actor,
        },
      });
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    broadcast('DELIVERY_UPDATED', { id: delivery._id.toString(), customerId: delivery.customerId });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: 'Delivery marked as Not Delivered (no charge applied)',
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Batch sync for offline mode
const batchSyncOfflineDeliveries = async (req, res) => {
  try {
    const { offlineActions } = req.body;

    if (!Array.isArray(offlineActions) || offlineActions.length === 0) {
      return res.json({ success: true, count: 0, message: 'No offline actions to sync' });
    }

    const missingProof = offlineActions.some((item) =>
      item.type === 'delivered' && !isPersistedProof(item.data?.proofImage)
    );
    if (missingProof) {
      return res.status(400).json({
        success: false,
        message: 'Offline delivery sync requires a successfully uploaded, persistent doorstep photo for every completed delivery.',
      });
    }

    let syncedCount = 0;
    for (const item of offlineActions) {
      if (item.type === 'delivered') {
        const deliveryQuery = item.id.length === 24 ? { _id: item.id } : { customerId: item.id };
        const deliveryForAccess = await Delivery.findOne(deliveryQuery);
        if (!deliveryForAccess) continue;
        if (!canManageDelivery(req.user, deliveryForAccess)) {
          return res.status(403).json({ success: false, message: 'Offline sync includes a delivery not assigned to this partner.' });
        }
        const internalResponse = {
          statusCode: 200,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(body) {
            this.body = body;
            return body;
          },
        };
        await markDelivered(
          { params: { id: item.id }, body: { ...item.data, deliveredAt: item.timestamp }, user: req.user },
          internalResponse
        );
        if (internalResponse.statusCode >= 400 || !internalResponse.body?.success) {
          return res.status(internalResponse.statusCode || 500).json({
            success: false,
            message: internalResponse.body?.message || 'Offline delivery could not be synced.',
          });
        }
        syncedCount++;
      } else if (item.type === 'not_delivered') {
        const query = item.id.length === 24 ? { _id: item.id } : { customerId: item.id };
        const delivery = await Delivery.findOne(query);
        if (!delivery) continue;
        if (!canManageDelivery(req.user, delivery)) {
          return res.status(403).json({ success: false, message: 'Offline sync includes a delivery not assigned to this partner.' });
        }
        delivery.status = 'not_delivered';
        delivery.notDeliveredReason = item.data?.reason || 'Customer Not Home';
        delivery.totalAmount = 0;
        await delivery.save();
        syncedCount++;
      }
    }

    await recordAudit('Offline Sync Completed', 'System', `Synced ${syncedCount} offline deliveries`, 'system');

    broadcast('DELIVERY_UPDATED', { syncedCount });

    return res.json({
      success: true,
      count: syncedCount,
      message: `Successfully synchronized ${syncedCount} offline deliveries`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Assign delivery to delivery partner (sends notification to delivery partner)
const assignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId, deliveryBoyName, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    delivery.deliveryBoyId = deliveryBoyId || '';
    delivery.deliveryBoyName = deliveryBoyName || '';
    await delivery.save();

    // Also update Customer delivery plan so future deliveries retain this assigned driver
    try {
      const custQuery = delivery.customerId.length === 24
        ? { $or: [{ _id: delivery.customerId }, { customerId: delivery.customerId }] }
        : { customerId: delivery.customerId };
      await Customer.findOneAndUpdate(custQuery, {
        $set: {
          'deliveryPlan.deliveryBoyId': deliveryBoyId || '',
          'deliveryPlan.deliveryBoyName': deliveryBoyName || '',
        },
      });
    } catch (custUpdateErr) {
      console.warn('Customer partner sync note:', custUpdateErr.message);
    }

    // Create notification for delivery partner
    try {
      await Notification.create({
        recipientRole: 'delivery_boy',
        recipientId: deliveryBoyId || '',
        title: '📦 New Delivery Assigned',
        message: `Dispatch Admin assigned customer ${delivery.customerName} (${delivery.plannedMilk}L Milk) at ${delivery.customerAddress || 'your route'} to your shift.`,
        type: 'delivery_assigned',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          deliveryBoyId,
          deliveryBoyName,
        },
      });
    } catch (notifErr) {
      console.warn('Driver notification error:', notifErr.message);
    }

    await recordAudit(
      'Delivery Partner Assigned',
      actor || 'Admin',
      `Assigned ${delivery.customerName} to ${deliveryBoyName || 'partner'}`,
      'delivery'
    );

    broadcast('DELIVERY_UPDATED', { id: delivery._id.toString(), deliveryBoyId });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: `Delivery assigned to ${deliveryBoyName || 'partner'} successfully`,
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete delivery from Admin & Driver Dashboards (retains in customer history)
const deleteDeliveryForAdminAndDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }

    delivery.deletedForAdmin = true;
    delivery.deletedForDriver = true;
    delivery.deletedAt = new Date();
    delivery.deletedBy = req.user?.name || 'Admin';
    await delivery.save();

    await recordAudit(
      'Delivery Deleted',
      req.user?.name || 'Admin',
      `Deleted delivery for ${delivery.customerName} on ${delivery.deliveryDate} from admin and driver dashboards (retained in customer history)`,
      'delivery'
    );

    broadcast('DELIVERY_UPDATED', { id: delivery._id.toString(), customerId: delivery.customerId });

    return res.json({
      success: true,
      message: 'Delivery deleted from admin and driver dashboards. Preserved in customer history.',
      id: delivery._id.toString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get recent delivered drops with photo proofs for live guest / customer feeds
const getRecentDeliveryProofs = async (req, res) => {
  try {
    const recent = await Delivery.find({
      status: 'delivered',
      proofImage: { $exists: true, $ne: '' },
    })
      .sort({ deliveredAt: -1, createdAt: -1 })
      .limit(10)
      .select('deliveryDate deliveredAt actualMilk actualCurd deliveryBoyName proofImage status paymentMethod customerName')
      .lean();

    const formatted = recent.map((del) => ({
      id: del._id.toString(),
      date: del.deliveryDate,
      time: del.deliveredAt,
      milk: `${del.actualMilk || 1} L`,
      curd: del.actualCurd ? `${del.actualCurd} g` : '0 g',
      status: 'delivered',
      paymentMethod: del.paymentMethod || 'Paid',
      proofImage: del.proofImage || '',
      deliveryBoyName: del.deliveryBoyName || 'Dairy Partner',
    }));

    return res.json({ success: true, deliveries: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDeliveries,
  getAssignedCustomers,
  markDelivered,
  markNotDelivered,
  batchSyncOfflineDeliveries,
  assignDelivery,
  deleteDeliveryForAdminAndDriver,
  getRecentDeliveryProofs,
};

