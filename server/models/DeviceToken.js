const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      default: '',
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'delivery_boy', 'customer', 'all'],
      default: 'customer',
      index: true,
    },
    platform: {
      type: String,
      enum: ['android', 'web', 'ios', 'unknown'],
      default: 'android',
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DeviceToken || mongoose.model('DeviceToken', deviceTokenSchema);
