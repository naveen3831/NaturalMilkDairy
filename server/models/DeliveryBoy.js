const mongoose = require('mongoose');

const deliveryBoySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  assignedArea: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  todayCompleted: { type: Number, default: 0 },
  todayPending: { type: Number, default: 0 },
  todayCashCollected: { type: Number, default: 0 },
  todayUpiCollected: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.DeliveryBoy || mongoose.model('DeliveryBoy', deliveryBoySchema);
