const mongoose = require('mongoose');

const deliveryLocationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  pincode: { type: String, default: '', trim: true },
  city: { type: String, default: 'Hyderabad', trim: true },
  state: { type: String, default: 'Telangana', trim: true },
  address: { type: String, default: '', trim: true },
  landmark: { type: String, default: '', trim: true },
  routeCode: { type: String, default: '', trim: true },
  deliverySlot: { type: String, default: 'Morning 5:00 AM - 7:30 AM', trim: true },
  isActive: { type: Boolean, default: true },
  assignedPartnerId: { type: String, default: '', trim: true },
  assignedPartnerName: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for fast search & sorting
deliveryLocationSchema.index({ name: 1, isActive: 1 });

module.exports = mongoose.models.DeliveryLocation || mongoose.model('DeliveryLocation', deliveryLocationSchema);
