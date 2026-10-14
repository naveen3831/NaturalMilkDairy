const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active', 'failed', 'expired', 'cancelled', 'paused', 'stopped'], default: 'pending' },
  providerOrderId: { type: String, required: true, unique: true },
  providerPaymentId: { type: String, default: undefined, unique: true, sparse: true },
  providerSignature: { type: String, default: '' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  plan: {
    milkQty: { type: Number, default: 0 },
    curdQty: { type: Number, default: 0 },
    frequency: { type: String, enum: ['daily', 'alternate', 'selected'], default: 'daily' },
    deliveryDays: [{ type: String }],
  },
  deliveryAddress: { type: String, required: true },
  area: { type: String, required: true },
  landmark: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  paymentRecordId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
