const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'other', 'razorpay'], default: 'cash' },
  purpose: { type: String, enum: ['ledger', 'subscription'], default: 'ledger' },
  subscriptionId: { type: String, default: '' },
  gatewayOrderId: { type: String, default: '' },
  gatewayPaymentId: { type: String, default: undefined, unique: true, sparse: true },
  paymentDate: { type: Date, default: Date.now },
  collectedBy: { type: String, default: 'Admin' },
  deliveryBoyId: { type: String, default: '' },
  referenceNumber: { type: String, default: '' },
  previousBalance: { type: Number, default: 0 },
  newBalance: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  deletedForCustomer: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
