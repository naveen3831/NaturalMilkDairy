const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true }, // e.g., 'CUST-001'
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  address: { type: String, required: true },
  area: { type: String, required: true },
  landmark: { type: String, default: '' },
  googleMapsUrl: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  addresses: [{
    id: {
      type: String,
      default: () => 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    },
    type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    label: { type: String, default: 'Home' },
    flatNo: { type: String, default: '' },
    apartmentStreet: { type: String, default: '' },
    street: { type: String, default: '' },
    area: { type: String, default: 'Madhapur' },
    landmark: { type: String, default: '' },
    googleMapsUrl: { type: String, default: '' },
    city: { type: String, default: 'Hyderabad' },
    state: { type: String, default: 'Telangana' },
    pincode: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    deliveryInstructions: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }],
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
    milkType: { type: String, default: 'Pure A2 Cow Milk' },
    planName: { type: String, default: 'Daily Farm Pure Milk Plan' },
    curdQty: { type: Number, default: 0 },
    curdUnit: { type: String, default: 'g' },
    extraProducts: [{
      productId: { type: String, default: '' },
      name: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      unit: { type: String, default: 'pack' },
      price: { type: Number, default: 0 },
    }],
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

// Safeguard hook: Guarantee every address has a unique non-empty string ID
customerSchema.pre('validate', function(next) {
  if (Array.isArray(this.addresses)) {
    this.addresses.forEach((addr, idx) => {
      if (!addr || typeof addr !== 'object') return;
      if (!addr.id || typeof addr.id !== 'string' || !addr.id.trim()) {
        addr.id = 'addr_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 7);
      }
    });
  }
  next();
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
