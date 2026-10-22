const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const CashHandover = require('../models/CashHandover');
const Notification = require('../models/Notification');
const { recordAudit } = require('../services/auditService');
const { broadcast } = require('../config/websocket');

const recordPayment = async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, referenceNumber, notes, collectedBy, deliveryBoyId } = req.body || {};

    const paymentAmount = Number(amount);
    const method = paymentMethod || 'cash';
    if (typeof customerId !== 'string' || customerId.length > 64 ||
      !Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > 1_000_000 ||
      !['cash', 'upi', 'bank_transfer', 'other'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Valid customer and payment amount are required' });
    }

    const query = customerId.length === 24 ? { _id: customerId } : { customerId };
    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const isDriver = req.user?.role === 'delivery_boy';
    if (isDriver) {
      const identity = [req.user.id, req.user.boyId, req.user.mobile].filter(Boolean);
      const assignedId = customer.deliveryPlan?.deliveryBoyId;
      const assignedName = customer.deliveryPlan?.deliveryBoyName;
      const isAssigned = identity.includes(assignedId) ||
        (req.user.name && assignedName &&
          req.user.name.trim().toLowerCase() === assignedName.trim().toLowerCase());
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'You can only record payments for your assigned customers.' });
      }
    }

    const prevBalance = customer.currentBalance;
    const newBalance = prevBalance - paymentAmount;

    customer.currentBalance = newBalance;
    await customer.save();

    const paymentRecord = await Payment.create({
      customerId: customer.customerId || customer._id.toString(),
      customerName: customer.name,
      amount: paymentAmount,
      paymentMethod: method,
      paymentDate: new Date(),
      collectedBy: isDriver ? req.user.name : (collectedBy || 'Admin'),
      deliveryBoyId: isDriver ? (req.user.boyId || req.user.id) : (deliveryBoyId || ''),
      referenceNumber: typeof referenceNumber === 'string' ? referenceNumber.slice(0, 120) : '',
      previousBalance: prevBalance,
      newBalance,
      notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
      createdAt: new Date(),
    });

    // Update driver daily collections
    const collectorBoyId = isDriver ? (req.user.boyId || req.user.id) : deliveryBoyId;
    if (collectorBoyId) {
      const boyQuery = collectorBoyId.length === 24 ? { _id: collectorBoyId } : { mobile: collectorBoyId };
      const boy = await DeliveryBoy.findOne(boyQuery);
      if (boy) {
        if (method === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + paymentAmount;
        if (method === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paymentAmount;
        await boy.save();
      }
    }

    await recordAudit(
      'Payment Recorded',
      collectedBy || 'Admin',
      `Received ₹${paymentAmount} via ${(paymentMethod || 'cash').toUpperCase()} from ${customer.name}. New Balance: ₹${newBalance}`,
      'payment'
    );

    broadcast('PAYMENT_RECORDED', { customerId: customer.customerId, amount: paymentAmount });
    broadcast('CUSTOMER_UPDATED', { customerId: customer.customerId });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: {
        ...paymentRecord.toObject(),
        id: paymentRecord._id.toString(),
      },
      customerBalance: newBalance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { customerId, method } = req.query;
    const filter = {};

    if (customerId) {
      filter.customerId = customerId;
    }
    if (method && method !== 'all') {
      filter.paymentMethod = method;
    }

    const list = await Payment.find(filter).sort({ paymentDate: -1 }).lean();

    return res.json({
      success: true,
      count: list.length,
      payments: list.map((p) => ({
        ...p,
        id: p._id.toString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Driver submits Cash Handover to Admin
 */
const submitCashHandover = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Handover details must be an object.' });
    }
    const {
      deliveryBoyId,
      deliveryBoyName,
      deliveryBoyMobile,
      assignedArea,
      amount,
      physicalCashCollected,
      upiCollected,
      handoverMethod,
      notes,
    } = req.body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) {
      return res.status(400).json({ success: false, message: 'Valid handover amount is required' });
    }

    let boy = null;
    if (req.user?.role === 'delivery_boy') {
      const identity = [req.user.id, req.user.boyId, req.user.mobile].filter(Boolean);
      boy = await DeliveryBoy.findOne({
        $or: [
          ...(identity.some((value) => /^[a-f\d]{24}$/i.test(value)) ? [{ _id: { $in: identity.filter((value) => /^[a-f\d]{24}$/i.test(value)) } }] : []),
          ...(identity.some((value) => !/^[a-f\d]{24}$/i.test(value)) ? [{ mobile: { $in: identity.filter((value) => !/^[a-f\d]{24}$/i.test(value)) } }] : []),
        ],
      });
      if (!boy) return res.status(403).json({ success: false, message: 'Delivery partner record not found.' });
    }

    const isDriver = req.user?.role === 'delivery_boy';
    const boyId = isDriver ? boy._id.toString() : (deliveryBoyId || req.user?.id || req.user?.boyId || '');
    const boyName = isDriver ? boy.name : (deliveryBoyName || req.user?.name || 'Delivery Partner');
    const boyMobile = isDriver ? boy.mobile : (deliveryBoyMobile || req.user?.mobile || '');
    const area = isDriver ? boy.assignedArea : (assignedArea || req.user?.assignedArea || '');

    // Check for existing handovers today to prevent duplicate submissions
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingHandovers = await CashHandover.find({
      $or: [
        { deliveryBoyId: boyId },
        { deliveryBoyMobile: boyMobile },
      ].filter(Boolean),
      createdAt: { $gte: startOfDay },
      status: { $in: ['pending', 'accepted'] },
    });

    const hasPending = existingHandovers.some((h) => h.status === 'pending');
    if (hasPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a cash handover pending admin verification. Please wait for admin approval.',
      });
    }

    const alreadyHandedOver = existingHandovers.reduce((sum, h) => sum + (h.amount || 0), 0);
    const totalPhysical = isDriver
      ? Number(boy.todayCashCollected) || 0
      : Number(physicalCashCollected) || parsedAmount;
    const availableCash = Math.max(0, totalPhysical - alreadyHandedOver);

    if (alreadyHandedOver > 0 && availableCash <= 0) {
      return res.status(400).json({
        success: false,
        message: 'All collected physical cash for today has already been handed over to admin.',
      });
    }

    if (parsedAmount > availableCash) {
      return res.status(400).json({
        success: false,
        message: `Cannot handover ₹${parsedAmount}. Remaining cash in hand is ₹${availableCash}.`,
      });
    }

    const handover = await CashHandover.create({
      deliveryBoyId: boyId,
      deliveryBoyName: boyName,
      deliveryBoyMobile: boyMobile,
      assignedArea: area,
      amount: parsedAmount,
      physicalCashCollected: totalPhysical,
      upiCollected: isDriver ? (Number(boy.todayUpiCollected) || 0) : (Number(upiCollected) || 0),
      handoverMethod: handoverMethod || 'cash',
      notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
      status: 'pending',
      handoverDate: new Date(),
    });

    // Create Notification for Admin
    await Notification.create({
      recipientRole: 'admin',
      recipientId: '',
      title: '💵 Driver Cash Handover Submitted',
      message: `${boyName} handed over ₹${parsedAmount} cash for route ${area || 'Shift'}. Pending your acceptance.`,
      type: 'payment_collected',
      data: {
        handoverId: handover._id.toString(),
        amount: parsedAmount,
        driverName: boyName,
        driverId: boyId,
      },
    });

    // Record audit trail
    await recordAudit(
      'Cash Handover Submitted',
      boyName,
      `Driver ${boyName} initiated cash handover of ₹${parsedAmount} (Route: ${area || 'Shift'})`,
      'payment'
    );

    broadcast('CASH_HANDOVER_SUBMITTED', {
      handoverId: handover._id.toString(),
      driverName: boyName,
      amount: parsedAmount,
    });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.status(201).json({
      success: true,
      message: 'Cash handover submitted successfully! Waiting for admin verification.',
      handover: {
        ...handover.toObject(),
        id: handover._id.toString(),
      },
    });
  } catch (err) {
    console.error('submitCashHandover error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Cash Handovers (admin sees all, driver sees own)
 */
const getCashHandovers = async (req, res) => {
  try {
    const { driverId, status } = req.query;
    const filter = {};

    if (req.user && req.user.role === 'delivery_boy') {
      const myId = req.user.id || req.user.boyId;
      filter.$or = [
        { deliveryBoyId: myId },
        { deliveryBoyMobile: req.user.mobile },
      ];
    } else if (driverId) {
      filter.$or = [
        { deliveryBoyId: driverId },
        { deliveryBoyMobile: driverId },
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const handovers = await CashHandover.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: handovers.length,
      handovers: handovers.map((h) => ({
        ...h,
        id: h._id.toString(),
      })),
    });
  } catch (err) {
    console.error('getCashHandovers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin updates Handover status (accepted or rejected)
 */
const updateHandoverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected' });
    }

    const handover = await CashHandover.findById(id);
    if (!handover) {
      return res.status(404).json({ success: false, message: 'Handover record not found' });
    }

    handover.status = status;
    handover.verifiedBy = req.user?.name || 'Dairy Admin';
    handover.verifiedAt = new Date();
    if (status === 'rejected' && rejectionReason) {
      handover.rejectionReason = rejectionReason;
    }

    await handover.save();

    // If accepted, update delivery boy collection status
    if (status === 'accepted') {
      const boy = await DeliveryBoy.findOne({
        $or: [
          { _id: handover.deliveryBoyId.length === 24 ? handover.deliveryBoyId : null },
          { mobile: handover.deliveryBoyMobile || handover.deliveryBoyId },
        ].filter(Boolean),
      });
      if (boy) {
        boy.todayCashCollected = Math.max(0, (boy.todayCashCollected || 0) - handover.amount);
        await boy.save();
      }
    }

    // Notify Driver
    await Notification.create({
      recipientRole: 'delivery_boy',
      recipientId: handover.deliveryBoyId,
      title: status === 'accepted' ? '✅ Cash Handover Accepted' : '⚠️ Cash Handover Rejected',
      message: status === 'accepted'
        ? `Your cash handover of ₹${handover.amount} was verified and accepted by ${req.user?.name || 'Dairy Admin'}.`
        : `Your cash handover of ₹${handover.amount} was rejected. Reason: ${rejectionReason || 'Please contact counter manager'}.`,
      type: 'payment_collected',
      data: {
        handoverId: handover._id.toString(),
        status,
        amount: handover.amount,
      },
    });

    // Record audit trail
    await recordAudit(
      status === 'accepted' ? 'Cash Handover Accepted' : 'Cash Handover Rejected',
      req.user?.name || 'Dairy Admin',
      `Cash handover of ₹${handover.amount} from driver ${handover.deliveryBoyName} was ${status.toUpperCase()} by ${req.user?.name || 'Admin'}`,
      'payment'
    );

    broadcast('CASH_HANDOVER_UPDATED', {
      handoverId: handover._id.toString(),
      driverId: handover.deliveryBoyId,
      status,
      amount: handover.amount,
    });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: `Handover successfully ${status}`,
      handover: {
        ...handover.toObject(),
        id: handover._id.toString(),
      },
    });
  } catch (err) {
    console.error('updateHandoverStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin deletes Cash Handover (e.g. accidental duplicates)
 */
const deleteCashHandover = async (req, res) => {
  try {
    const { id } = req.params;
    const handover = await CashHandover.findById(id);
    if (!handover) {
      return res.status(404).json({ success: false, message: 'Handover record not found' });
    }

    await CashHandover.findByIdAndDelete(id);

    await recordAudit(
      'Cash Handover Deleted',
      req.user?.name || 'Dairy Admin',
      `Deleted cash handover record of ₹${handover.amount} for driver ${handover.deliveryBoyName}`,
      'payment'
    );

    broadcast('CASH_HANDOVER_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: 'Cash handover record deleted successfully',
    });
  } catch (err) {
    console.error('deleteCashHandover error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  recordPayment,
  getAllPayments,
  submitCashHandover,
  getCashHandovers,
  updateHandoverStatus,
  deleteCashHandover,
};
