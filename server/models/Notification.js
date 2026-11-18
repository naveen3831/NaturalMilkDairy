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
        'subscription_created',
        'route_update',
        'system',
        'partner_message',
        'customer_message',
        'ticket',
        'driver_duty',
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

// Automatic Real-Time & FCM Push Dispatch on every created notification
notificationSchema.post('save', function (doc) {
  try {
    const { broadcast } = require('../config/websocket');
    const { sendPushNotification } = require('../services/fcmService');
    const formatted = doc.toObject();
    formatted.id = formatted._id.toString();

    // 1. WebSocket Real-time Broadcast to Mobile & Web
    broadcast('NOTIFICATION_CREATED', formatted);
    broadcast('NOTIFICATION_UPDATED', { action: 'created', notification: formatted });

    // 2. Dispatch Push Notification to all registered devices
    sendPushNotification({
      recipientRole: formatted.recipientRole,
      recipientId: formatted.recipientId,
      title: formatted.title,
      body: formatted.message,
      data: {
        id: formatted.id,
        type: String(formatted.type || 'system'),
        ...(formatted.data || {}),
      },
    }).catch((pushErr) => console.warn('FCM auto-dispatch notice:', pushErr.message));
  } catch (err) {
    console.warn('Notification post-save hook notice:', err.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
