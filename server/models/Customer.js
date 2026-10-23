const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  mobile: { type: String, required: true },
  password: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  address: { type: String, required: true },
  area: { type: String, default: '' },
  landmark: { type: String, default: '' },
  addresses: [
    {
      id: { type: String, required: true },
      type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
      label: { type: String, default: 'Home' },
      flatNo: { type: String, default: '' },
      apartmentStreet: { type: String, default: '' },
      area: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, default: 'Hyderabad' },
      pincode: { type: String, default: '' },
      deliveryInstructions: { type: String, default: '' },
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: ['active', 'paused', 'inactive'], default: 'active' },
  subscription: {
    status: { type: String, enum: ['pending_payment', 'active', 'expired', 'cancelled', 'paused', 'stopped'], default: undefined },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    amount: { type: Number, default: 0 },
    paymentId: { type: String, default: '' },
  },
  pauseFrom: { type: String, default: null }, // YYYY-MM-DD
  pauseUntil: { type: String, default: null }, // YYYY-MM-DD
  temporaryQty: {
    date: { type: String, default: null }, // YYYY-MM-DD
    milkQty: { type: Number, default: null },
    curdQty: { type: Number, default: null },
  },
  deliveryPlan: {
    milkQty: { type: Number, default: 1 },
    milkUnit: { type: String, default: 'L' },
    curdQty: { type: Number, default: 0 },
    curdUnit: { type: String, default: 'g' },
    frequency: { type: String, enum: ['daily', 'alternate', 'selected', 'custom'], default: 'daily' },
    deliveryDays: [{ type: String }], // ['Mon', 'Wed', 'Fri']
    deliveryBoyId: { type: String, default: '' },
    deliveryBoyName: { type: String, default: '' },
    startDate: { type: Date, default: Date.now },
  },
  paymentInfo: {
    paymentType: { type: String, enum: ['credit', 'prepaid', 'cod'], default: 'credit' },
    paymentCycle: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
  },
  currentBalance: { type: Number, default: 0 }, // >0 pending credit, <0 advance
  createdBy: { type: String, enum: ['admin', 'driver', 'self'], default: 'admin' },
  createdByDriverId: { type: String, default: '' },
  createdByDriverName: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
