const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['admin', 'delivery_boy', 'customer', 'all'],
      required: true,
      default: 'all',
    },
    recipientId: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'delivery_assigned',
        'delivery_completed',
        'delivery_missed',
        'payment_collected',
        'route_update',
        'system',
      ],
      default: 'system',
    },
    data: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
