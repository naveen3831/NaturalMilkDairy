const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  deliveryBoyId: { type: String, default: '' },
  deliveryBoyName: { type: String, default: '' },
  deliveryDate: { type: String, required: true }, // 'YYYY-MM-DD'
  plannedMilk: { type: Number, default: 0 },
  plannedCurd: { type: Number, default: 0 },
  actualMilk: { type: Number, default: 0 },
  actualCurd: { type: Number, default: 0 },
  milkPrice: { type: Number, default: 60 },
  curdPrice: { type: Number, default: 60 }, // per unit or per kg
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'delivered', 'not_delivered'], default: 'pending' },
  notDeliveredReason: { type: String, default: '' },
  paymentStatus: { type: String, enum: ['credit', 'paid', 'advance', 'pending'], default: 'credit' },
  paymentAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['credit', 'cash', 'upi', 'advance', 'none'], default: 'credit' },
  notes: { type: String, default: '' },
  deliveredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
