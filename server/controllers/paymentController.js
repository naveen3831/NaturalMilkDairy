const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const CashHandover = require('../models/CashHandover');
const Notification = require('../models/Notification');
const { recordAudit } = require('../services/auditService');
const { broadcast } = require('../config/websocket');

const recordPayment = async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, referenceNumber, notes, collectedBy, deliveryBoyId } = req.body;

    if (!customerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid customer and payment amount are required' });
    }

    const query = customerId.length === 24 ? { _id: customerId } : { customerId };
    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const prevBalance = customer.currentBalance;
    const paymentAmount = Number(amount);
    const newBalance = prevBalance - paymentAmount;

    customer.currentBalance = newBalance;
    await customer.save();

    const paymentRecord = await Payment.create({
      customerId: customer.customerId || customer._id.toString(),
      customerName: customer.name,
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentDate: new Date(),
      collectedBy: collectedBy || 'Admin',
      deliveryBoyId: deliveryBoyId || '',
      referenceNumber: referenceNumber || '',
      previousBalance: prevBalance,
      newBalance,
      notes: notes || '',
      createdAt: new Date(),
    });

    // Update driver daily collections
    if (deliveryBoyId) {
      const boyQuery = deliveryBoyId.length === 24 ? { _id: deliveryBoyId } : { mobile: deliveryBoyId };
      const boy = await DeliveryBoy.findOne(boyQuery);
      if (boy) {
        if (paymentMethod === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + paymentAmount;
        if (paymentMethod === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paymentAmount;
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
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid handover amount is required' });
    }

    const boyId = deliveryBoyId || req.user?.id || req.user?.boyId || '';
    const boyName = deliveryBoyName || req.user?.name || 'Delivery Partner';
    const boyMobile = deliveryBoyMobile || req.user?.mobile || '';
    const area = assignedArea || req.user?.assignedArea || '';

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
    const totalPhysical = Number(physicalCashCollected) || parsedAmount;
    const availableCash = Math.max(0, totalPhysical - alreadyHandedOver);

    if (alreadyHandedOver > 0 && availableCash <= 0) {
      return res.status(400).json({
        success: false,
        message: 'All collected physical cash for today has already been handed over to admin.',
      });
    }

    if (parsedAmount > availableCash && availableCash > 0) {
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
      physicalCashCollected: Number(physicalCashCollected) || parsedAmount,
      upiCollected: Number(upiCollected) || 0,
      handoverMethod: handoverMethod || 'cash',
      notes: notes || '',
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


