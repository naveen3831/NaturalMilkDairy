const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const { recordAudit } = require('../services/auditService');

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

module.exports = { recordPayment, getAllPayments };
