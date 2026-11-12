const Delivery = require('../models/Delivery');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const DeliveryLocation = require('../models/DeliveryLocation');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const { recordAudit } = require('../services/auditService');
const { ensureDeliveriesForDate, ensureDeliveriesForRange, formatDate } = require('../services/deliveryService');
const { broadcast } = require('../config/websocket');
const { isCloudinaryUrl, ensureCloudinaryUrl } = require('../config/cloudinary');

const isPersistedProof = (proofImage) => {
  const proofUrl = typeof proofImage === 'string' ? proofImage.trim() : '';
  if (!proofUrl || proofUrl.length > 2048) return false;
  if (proofUrl.startsWith('data:')) return false;
  return isCloudinaryUrl(proofUrl);
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

      const partnerIds = new Set([req.user.id, req.user.boyId, req.user.mobile].filter(Boolean));
      const partnerNames = new Set(req.user.name ? [req.user.name.trim()] : []);
      let partnerArea = (req.user.assignedArea || req.user.area || '').trim();

      // Look up DeliveryBoy document to resolve all associated IDs and territory
      const boyQuery = [
        ...(req.user.id && /^[a-f\d]{24}$/i.test(req.user.id) ? [{ _id: req.user.id }] : []),
        ...(req.user.mobile ? [{ mobile: req.user.mobile }] : []),
        ...(req.user.name ? [{ name: new RegExp(`^${req.user.name.trim()}$`, 'i') }] : []),
      ];
      if (boyQuery.length) {
        const boy = await DeliveryBoy.findOne({ $or: boyQuery }).lean();
        if (boy) {
          partnerIds.add(boy._id.toString());
          if (boy.mobile) partnerIds.add(boy.mobile);
          if (boy.name) partnerNames.add(boy.name.trim());
          if (boy.area && !partnerArea) partnerArea = boy.area.trim();
        }
      }

      // Find all customers assigned to this delivery partner or in their territory
      const assignedCusts = await Customer.find({
        status: { $ne: 'inactive' },
        $or: [
          { 'deliveryPlan.deliveryBoyId': { $in: [...partnerIds] } },
          { 'deliveryPlan.deliveryBoyName': { $in: [...partnerNames].map((n) => new RegExp(`^${n}$`, 'i')) } },
          { createdByDriverId: { $in: [...partnerIds] } },
          ...(partnerArea ? [{ area: new RegExp(`^${partnerArea}$`, 'i') }] : []),
        ],
      }).lean();

      const assignedCustIds = [];
      for (const c of assignedCusts) {
        if (c.customerId) assignedCustIds.push(c.customerId);
        if (c._id) assignedCustIds.push(c._id.toString());
      }

      const assignedFilter = [
        { deliveryBoyId: { $in: [...partnerIds] } },
        ...[...partnerNames].map((n) => ({ deliveryBoyName: new RegExp(`^${n}$`, 'i') })),
        ...(assignedCustIds.length ? [{ customerId: { $in: assignedCustIds } }] : []),
        ...(partnerArea ? [
          {
            $or: [
              { customerAddress: new RegExp(partnerArea, 'i') },
              { customerArea: new RegExp(partnerArea, 'i') },
            ],
          },
        ] : []),
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

    // Enrich deliveries with Customer area, landmark, and coordinates (fallback to DeliveryLocation)
    const custIds = [...new Set(list.map((d) => d.customerId).filter(Boolean))];
    const objectCustIds = custIds.filter((id) => /^[a-f\d]{24}$/i.test(id));
    const phones = [...new Set(list.map((d) => d.customerPhone).filter(Boolean))];
    const [custDocs, locDocs] = await Promise.all([
      (custIds.length || phones.length)
        ? Customer.find({
            $or: [
              ...(custIds.length ? [{ customerId: { $in: custIds } }] : []),
              ...(objectCustIds.length ? [{ _id: { $in: objectCustIds } }] : []),
              ...(phones.length ? [{ mobile: { $in: phones } }] : []),
            ],
          }).select('customerId mobile area landmark latitude longitude addresses').lean()
        : [],
      DeliveryLocation.find({ isActive: true }).select('name latitude longitude').lean().catch(() => []),
    ]);

    const custMap = new Map();
    for (const c of custDocs) {
      if (c.customerId) custMap.set(c.customerId, c);
      if (c._id) custMap.set(c._id.toString(), c);
      if (c.mobile) custMap.set(c.mobile, c);
    }
    const locMap = new Map();
    for (const loc of locDocs) {
      if (loc.name) locMap.set(loc.name.trim().toLowerCase(), loc);
    }

    const enrichedDeliveries = list.map((d) => {
      const cust = custMap.get(d.customerId) || custMap.get(d.customerPhone) || null;
      const areaName = (d.customerArea || cust?.area || '').trim();
      const loc = areaName ? locMap.get(areaName.toLowerCase()) : null;
      const lat = d.latitude ?? d.customerLatitude ?? cust?.latitude ?? cust?.addresses?.[0]?.latitude ?? loc?.latitude ?? null;
      const lng = d.longitude ?? d.customerLongitude ?? cust?.longitude ?? cust?.addresses?.[0]?.longitude ?? loc?.longitude ?? null;
      return {
        ...d,
        id: d._id.toString(),
        customerArea: areaName || (loc?.name || ''),
        area: d.area || areaName || (loc?.name || ''),
        landmark: d.landmark || cust?.landmark || '',
        latitude: lat,
        longitude: lng,
        customerLatitude: lat,
        customerLongitude: lng,
      };
    });

    const total = enrichedDeliveries.length;
    const delivered = enrichedDeliveries.filter((d) => d.status === 'delivered').length;
    const pending = enrichedDeliveries.filter((d) => d.status === 'pending').length;
    const notDelivered = enrichedDeliveries.filter((d) => d.status === 'not_delivered').length;

    return res.json({
      success: true,
      date: targetDate,
      summary: { total, delivered, pending, notDelivered },
      deliveries: enrichedDeliveries,
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

    const partnerArea = (deliveryBoy?.area || user?.assignedArea || user?.area || req.user?.assignedArea || req.user?.area || '').trim();

    const assignmentFilters = [];
    if (partnerIds.size) assignmentFilters.push({ 'deliveryPlan.deliveryBoyId': { $in: [...partnerIds] } });
    if (partnerNames.size) assignmentFilters.push({ 'deliveryPlan.deliveryBoyName': { $in: [...partnerNames] } });
    if (partnerIds.size) assignmentFilters.push({ createdByDriverId: { $in: [...partnerIds] } });
    if (partnerArea) assignmentFilters.push({ area: new RegExp(`^${partnerArea}$`, 'i') });
    if (!assignmentFilters.length) {
      return res.json({ success: true, customers: [] });
    }

    const customers = await Customer.find({
      status: { $ne: 'inactive' },
      $or: assignmentFilters,
    }).sort({ createdAt: -1, name: 1 }).lean();

    const customerIds = customers.map((c) => c.customerId).filter(Boolean);
    const customerObjectIds = customers.map((c) => c._id).filter(Boolean);
    const activeSubscriptions = await Subscription.find({
      $or: [
        { customerId: { $in: customerIds } },
        { customer: { $in: customerObjectIds } },
      ],
      status: 'active',
    }).sort({ createdAt: -1 }).lean();

    const subByCustomerId = {};
    activeSubscriptions.forEach((s) => {
      if (s.customerId && !subByCustomerId[s.customerId]) {
        subByCustomerId[s.customerId] = s;
      }
      if (s.customer && !subByCustomerId[s.customer.toString()]) {
        subByCustomerId[s.customer.toString()] = s;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const assignedCustomers = customers.map((customer) => {
      const activeSub = subByCustomerId[customer.customerId] || subByCustomerId[customer._id?.toString()] || null;
      const plan = { ...(customer.deliveryPlan || {}) };
      if (!plan.milkQty || Number(plan.milkQty) <= 0) {
        plan.milkQty = Number(activeSub?.plan?.milkQty) || 1;
      }
      if (!plan.frequency) {
        plan.frequency = activeSub?.plan?.frequency || 'daily';
      }
      const subscription = { ...(customer.subscription || {}) };
      if (!subscription.startDate && activeSub?.startDate) {
        subscription.startDate = activeSub.startDate;
      }
      if (!subscription.endDate && activeSub?.endDate) {
        subscription.endDate = activeSub.endDate;
      }

      const startDate = subscription.startDate || plan.startDate || activeSub?.startDate || customer.createdAt;
      const endDate = subscription.status === 'active' ? (subscription.endDate || activeSub?.endDate) : null;
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
          status: subscription.status || (subscription.endDate && new Date(subscription.endDate) < new Date() ? 'expired' : (customer.status || 'active')),
          startDate: subscription.startDate || customer.subscriptionStart || plan.startDate || activeSub?.startDate || null,
          endDate: subscription.endDate || customer.subscriptionEnd || plan.endDate || activeSub?.endDate || null,
          amount: subscription.amount || activeSub?.amount || 0,
          paymentId: subscription.paymentId || activeSub?.paymentRecordId || '',
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

    if (req.user?.role === 'delivery_boy') {
      const DeliveryBoy = require('../models/DeliveryBoy');
      const driverRecord = await DeliveryBoy.findOne({
        $or: [
          ...(req.user.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),
          ...(req.user.mobile ? [{ mobile: req.user.mobile }] : []),
          ...(req.user.name ? [{ name: new RegExp(`^${req.user.name}$`, 'i') }] : []),
        ],
      }).lean();
      if (driverRecord && driverRecord.isOnline === false) {
        return res.status(403).json({
          success: false,
          message: 'You are currently offline. Please switch to Online duty to mark deliveries.',
        });
      }
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

    let proofUrl = (typeof proofImage === 'string' && proofImage.trim())
      ? proofImage.trim()
      : (typeof req.body.proofUrl === 'string' ? req.body.proofUrl.trim() : '');

    // Enforce Cloudinary storage for any proof image before writing to MongoDB
    if (proofUrl) {
      try {
        proofUrl = await ensureCloudinaryUrl(proofUrl, {
          folder: 'natural-milk-dairy/delivery-proofs',
          timeoutMs: 30000,
        });
      } catch (err) {
        console.error('Failed to store delivery proof image in Cloudinary:', err.message);
        return res.status(502).json({
          success: false,
          message: `Failed to store doorstep photo in Cloudinary: ${err.message}`,
        });
      }
    }

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

    // Parse doorstep add-on products selected by the delivery partner
    const rawAddons = Array.isArray(req.body.addons)
      ? req.body.addons
      : (Array.isArray(req.body.addonItems) ? req.body.addonItems : []);
    const sanitizedAddons = rawAddons
      .filter((a) => a && typeof a === 'object' && Number(a.quantity) > 0)
      .map((a) => ({
        productId: a.productId ? String(a.productId) : (a.id ? String(a.id) : (a._id ? String(a._id) : '')),
        name: String(a.name || 'Dairy Add-on').trim(),
        quantity: Number(a.quantity) || 1,
        unit: String(a.unit || 'pack').trim(),
        price: Math.max(0, Number(a.price) || 0),
      }));

    const addonsTotal = sanitizedAddons.reduce((sum, a) => sum + (a.price * a.quantity), 0);
    const existingExtra = Array.isArray(delivery.extraItems) ? delivery.extraItems : [];
    const baseAmount = milk * milkPrice + (curd / 500) * curdPrice;
    const totalAmount = baseAmount + addonsTotal;

    const activeSubscription = customer?.subscription?.status === 'active' &&
      customer.subscription.endDate &&
      formatDate(new Date(customer.subscription.endDate)) >= delivery.deliveryDate;

    const addonPayMethodReq = (req.body.addonPaymentMethod || '').toString().trim().toLowerCase();
    const method = activeSubscription ? 'advance' : (paymentMethod || delivery.paymentMethod || 'credit');

    delivery.actualMilk = milk;
    delivery.actualCurd = curd;
    delivery.addons = sanitizedAddons;
    delivery.addonsTotal = addonsTotal;
    if (sanitizedAddons.length > 0) {
      delivery.extraItems = [...existingExtra, ...sanitizedAddons];
    }
    delivery.totalAmount = totalAmount;
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.paymentMethod = method;
    delivery.subscriptionEndDate = activeSubscription ? customer.subscription.endDate : delivery.subscriptionEndDate;
    delivery.proofImage = proofUrl;

    let totalPaidNow = 0;
    let paidMethod = '';
    let balanceDelta = 0;

    if (activeSubscription) {
      if (addonsTotal > 0) {
        const effAddonMethod = ['cash', 'upi', 'credit'].includes(addonPayMethodReq)
          ? addonPayMethodReq
          : (['cash', 'upi'].includes(paymentMethod) ? paymentMethod : 'credit');
        delivery.addonPaymentMethod = effAddonMethod;
        if (effAddonMethod === 'cash' || effAddonMethod === 'upi') {
          const reqAddonCol = req.body.addonCollectedAmount !== undefined && req.body.addonCollectedAmount !== null
            ? Number(req.body.addonCollectedAmount)
            : NaN;
          const reqMainCol = collectedAmount !== undefined && collectedAmount !== null
            ? Number(collectedAmount)
            : NaN;
          const rawAddonPaid = ['cash', 'upi'].includes(paymentMethod) && Number.isFinite(reqMainCol) && reqMainCol > 0
            ? Math.max(reqMainCol, Number.isFinite(reqAddonCol) ? reqAddonCol : 0)
            : (Number.isFinite(reqAddonCol) ? reqAddonCol : addonsTotal);
          totalPaidNow = Math.max(0, isNaN(rawAddonPaid) ? addonsTotal : rawAddonPaid);
          paidMethod = effAddonMethod;
          delivery.addonPaidAmount = totalPaidNow;
          delivery.paymentAmount = totalPaidNow;
          delivery.paymentStatus = totalPaidNow >= addonsTotal ? 'paid' : 'pending';
          balanceDelta = addonsTotal - totalPaidNow;
        } else {
          delivery.addonPaidAmount = 0;
          delivery.paymentAmount = 0;
          delivery.paymentStatus = 'credit';
          balanceDelta = addonsTotal;
        }
      } else if (['cash', 'upi'].includes(paymentMethod) && Number(collectedAmount) > 0) {
        // Explicit cash/UPI collected at doorstep on an active subscription drop
        totalPaidNow = Math.max(0, Number(collectedAmount));
        paidMethod = paymentMethod;
        delivery.addonPaymentMethod = '';
        delivery.addonPaidAmount = 0;
        delivery.paymentMethod = paymentMethod;
        delivery.paymentAmount = totalPaidNow;
        delivery.paymentStatus = 'paid';
        balanceDelta = -totalPaidNow;
      } else {
        delivery.addonPaymentMethod = '';
        delivery.addonPaidAmount = 0;
        delivery.paymentAmount = 0;
        delivery.paymentStatus = 'paid';
      }
    } else if (method === 'cash' || method === 'upi') {
      const rawPaid = collectedAmount !== undefined && collectedAmount !== null ? Number(collectedAmount) : totalAmount;
      totalPaidNow = Math.max(0, isNaN(rawPaid) ? totalAmount : rawPaid);
      paidMethod = method;
      delivery.paymentAmount = totalPaidNow;
      delivery.addonPaymentMethod = addonsTotal > 0 ? method : '';
      delivery.addonPaidAmount = addonsTotal > 0 ? Math.min(totalPaidNow, addonsTotal) : 0;
      delivery.paymentStatus = totalPaidNow >= totalAmount ? 'paid' : 'credit';
      balanceDelta = totalAmount - totalPaidNow;
    } else {
      // Base delivery on credit/advance (non-subscription), check if add-ons were paid separately via cash/upi
      if (addonsTotal > 0 && ['cash', 'upi'].includes(addonPayMethodReq)) {
        const rawAddonPaid = req.body.addonCollectedAmount !== undefined && req.body.addonCollectedAmount !== null
          ? Number(req.body.addonCollectedAmount)
          : addonsTotal;
        totalPaidNow = Math.max(0, isNaN(rawAddonPaid) ? addonsTotal : rawAddonPaid);
        paidMethod = addonPayMethodReq;
        delivery.addonPaymentMethod = addonPayMethodReq;
        delivery.addonPaidAmount = totalPaidNow;
        delivery.paymentAmount = totalPaidNow;
        delivery.paymentStatus = totalPaidNow >= totalAmount ? 'paid' : 'credit';
        balanceDelta = totalAmount - totalPaidNow;
      } else {
        delivery.addonPaymentMethod = addonsTotal > 0 ? 'credit' : '';
        delivery.addonPaidAmount = 0;
        delivery.paymentAmount = 0;
        delivery.paymentStatus = 'credit';
        balanceDelta = totalAmount;
      }
    }

    if (req.body.proofLocation) delivery.customerAddress = req.body.proofLocation;
    if (req.body.latitude !== undefined && req.body.latitude !== null && !isNaN(Number(req.body.latitude))) {
      delivery.latitude = Number(req.body.latitude);
      delivery.customerLatitude = Number(req.body.latitude);
    } else if (!delivery.latitude && customer?.latitude) {
      delivery.latitude = Number(customer.latitude);
      delivery.customerLatitude = Number(customer.latitude);
    }
    if (req.body.longitude !== undefined && req.body.longitude !== null && !isNaN(Number(req.body.longitude))) {
      delivery.longitude = Number(req.body.longitude);
      delivery.customerLongitude = Number(req.body.longitude);
    } else if (!delivery.longitude && customer?.longitude) {
      delivery.longitude = Number(customer.longitude);
      delivery.customerLongitude = Number(customer.longitude);
    }
    if (notes) delivery.notes = notes;
    await delivery.save();

    let newCustomerBalance = 0;

    if (customer) {
      const prevBal = Number(customer.currentBalance) || 0;
      if (balanceDelta !== 0) {
        customer.currentBalance = prevBal + balanceDelta;
        await customer.save();
      }
      newCustomerBalance = customer.currentBalance;

      if (totalPaidNow > 0 && (paidMethod === 'cash' || paidMethod === 'upi')) {
        const addonSummary = sanitizedAddons.length > 0
          ? ` + Add-ons: ${sanitizedAddons.map((a) => `${a.name} x${a.quantity}`).join(', ')}`
          : '';
        // Record Payment in MongoDB
        await Payment.create({
          customerId: customer.customerId || customer._id.toString(),
          customerName: customer.name,
          amount: totalPaidNow,
          paymentMethod: paidMethod,
          paymentDate: new Date(),
          collectedBy: actor || delivery.deliveryBoyName || 'Delivery Boy',
          deliveryBoyId: delivery.deliveryBoyId,
          referenceNumber: `${paidMethod.toUpperCase()}-DELIVERY-${formatDate()}`,
          previousBalance: prevBal,
          newBalance: customer.currentBalance,
          notes: `Collected during delivery on ${delivery.deliveryDate}${addonSummary}`,
          createdAt: new Date(),
        });

        // Update driver's daily cash/UPI totals (match by deliveryBoyId, mobile, or name fallback)
        const boyOrConditions = [];
        if (delivery.deliveryBoyId) {
          if (delivery.deliveryBoyId.length === 24 && /^[a-f\d]{24}$/i.test(delivery.deliveryBoyId)) {
            boyOrConditions.push({ _id: delivery.deliveryBoyId });
          }
          boyOrConditions.push({ mobile: delivery.deliveryBoyId });
        }
        if (req.user?.boyId && /^[a-f\d]{24}$/i.test(String(req.user.boyId))) {
          boyOrConditions.push({ _id: req.user.boyId });
        }
        if (req.user?.mobile) {
          boyOrConditions.push({ mobile: req.user.mobile });
        }
        const boyNameMatch = delivery.deliveryBoyName || req.user?.name;
        if (boyNameMatch) {
          boyOrConditions.push({ name: new RegExp(`^${boyNameMatch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
        if (boyOrConditions.length > 0) {
          const boy = await DeliveryBoy.findOne({ $or: boyOrConditions });
          if (boy) {
            if (paidMethod === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + totalPaidNow;
            if (paidMethod === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + totalPaidNow;
            await boy.save();
          }
        }
      }
    }

    const addonsDesc = sanitizedAddons.length > 0
      ? ` + Add-ons (${sanitizedAddons.map((a) => `${a.name} x${a.quantity}`).join(', ')}, ₹${addonsTotal})`
      : '';
    await recordAudit(
      'Delivery Completed',
      actor || delivery.deliveryBoyName || 'Delivery Boy',
      `Delivered ${milk}L Milk + ${curd}g Curd${addonsDesc} to ${delivery.customerName} (Total ₹${totalAmount}, Paid ₹${totalPaidNow} ${paidMethod ? paidMethod.toUpperCase() : method.toUpperCase()})`,
      'delivery'
    );

    // Send real-time notification to Admin & Customer
    try {
      await Notification.create({
        recipientRole: 'admin',
        title: sanitizedAddons.length > 0 ? '✅ Delivery + Add-ons Completed' : '✅ Delivery Completed',
        message: `${actor || delivery.deliveryBoyName || 'Driver'} delivered ${milk}L Milk${curd > 0 ? ` + ${curd}g Curd` : ''}${addonsDesc} to ${delivery.customerName}. Order Total: ₹${totalAmount}${totalPaidNow > 0 ? ` • Collected ₹${totalPaidNow} (${paidMethod.toUpperCase()})` : ` (${method.toUpperCase()})`}.`,
        type: 'delivery_completed',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          amount: totalAmount,
          addonsTotal,
          addons: sanitizedAddons,
          paidAmount: totalPaidNow,
          method: paidMethod || method,
          driverName: delivery.deliveryBoyName || actor,
        },
      });
      if (customer) {
        await Notification.create({
          recipientRole: 'customer',
          recipientId: customer._id.toString(),
          title: 'Delivery Completed',
          message: sanitizedAddons.length > 0
            ? `Your delivery for ${delivery.deliveryDate}${addonsDesc} is complete. Add-on amount: ₹${addonsTotal}${totalPaidNow > 0 ? ` (Paid ₹${totalPaidNow} ${paidMethod.toUpperCase()})` : ''}.`
            : `Your delivery for ${delivery.deliveryDate} is complete. View the doorstep photo proof in your delivery history.`,
          type: 'delivery_completed',
          data: { deliveryId: delivery._id.toString(), proofImage: delivery.proofImage, addons: sanitizedAddons, addonsTotal },
        });
      }
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    broadcast('DELIVERY_UPDATED', { id: delivery._id.toString(), customerId: delivery.customerId });
    broadcast('CUSTOMER_UPDATED', { id: delivery.customerId, customerId: delivery.customerId });
    if (totalPaidNow > 0) {
      broadcast('PAYMENT_UPDATED', { customerId: delivery.customerId, amount: totalPaidNow, method: paidMethod, addonsTotal });
      broadcast('DELIVERY_BOY_UPDATED', { id: delivery.deliveryBoyId || '', name: delivery.deliveryBoyName || actor || '' });
    }
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

