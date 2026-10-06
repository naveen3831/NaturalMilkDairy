const store = require('../storage/store');

const recordPayment = (req, res) => {
  const { customerId, amount, paymentMethod, referenceNumber, notes, collectedBy, deliveryBoyId } = req.body;

  if (!customerId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid customer and payment amount are required' });
  }

  const customer = store.data.customers.find((c) => c.id === customerId || c.customerId === customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const prevBalance = customer.currentBalance;
  const paymentAmount = Number(amount);
  const newBalance = prevBalance - paymentAmount;

  customer.currentBalance = newBalance;

  const paymentRecord = {
    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    customerId: customer.id,
    customerName: customer.name,
    amount: paymentAmount,
    paymentMethod: paymentMethod || 'cash',
    paymentDate: new Date().toISOString(),
    collectedBy: collectedBy || 'Admin',
    deliveryBoyId: deliveryBoyId || '',
    referenceNumber: referenceNumber || '',
    previousBalance: prevBalance,
    newBalance,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  store.data.payments.unshift(paymentRecord);

  // If collected by a delivery boy, update their today reconciliation
  if (deliveryBoyId) {
    const boy = store.data.deliveryBoys.find((b) => b.id === deliveryBoyId);
    if (boy) {
      if (paymentMethod === 'cash') {
        boy.todayCashCollected = (boy.todayCashCollected || 0) + paymentAmount;
      } else if (paymentMethod === 'upi') {
        boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paymentAmount;
      }
    }
  }

  store.addAudit(
    'Payment Recorded',
    collectedBy || 'Admin',
    `Received ₹${paymentAmount} via ${(paymentMethod || 'cash').toUpperCase()} from ${customer.name}. New Balance: ₹${newBalance}`,
    'payment'
  );

  store.save();

  return res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    payment: paymentRecord,
    customerBalance: newBalance,
  });
};

const getAllPayments = (req, res) => {
  const { customerId, method } = req.query;
  let list = [...store.data.payments];

  if (customerId) {
    list = list.filter((p) => p.customerId === customerId);
  }

  if (method && method !== 'all') {
    list = list.filter((p) => p.paymentMethod === method);
  }

  return res.json({ success: true, count: list.length, payments: list });
};

module.exports = { recordPayment, getAllPayments };
