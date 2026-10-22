const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'delivery_boy', 'customer', 'user'], default: 'customer' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  assignedArea: { type: String, default: '' },
  address: { type: String, default: '' },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
