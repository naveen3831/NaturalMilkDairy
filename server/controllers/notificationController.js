const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { broadcast } = require('../config/websocket');

// Default initial notifications to seed if collection is truly brand new
const defaultSeedNotifications = [
  {
    recipientRole: 'delivery_boy',
    recipientId: '',
    title: '📦 Shift Route Assigned',
    message: 'Dispatch Admin assigned your morning route with 5 customer doorstep deliveries in Madhapur.',
    type: 'delivery_assigned',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    recipientRole: 'delivery_boy',
    recipientId: '',
    title: '⏰ Shift Start Reminder',
    message: 'Morning delivery window begins at 04:30 AM. Battery charged to 85% on vehicle TS 09 EA 4812.',
    type: 'system',
    isRead: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    recipientRole: 'admin',
    recipientId: '',
    title: '✅ Delivery Completed',
    message: 'Naveen Kumar delivered 2L Farm Fresh Cow Milk to K. Rajesh Varma (Sai Teja Residency). Collected ₹150 cash.',
    type: 'delivery_completed',
    isRead: false,
    createdAt: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    recipientRole: 'admin',
    recipientId: '',
    title: '✅ Delivery Completed',
    message: 'Naveen Kumar delivered 1.5L Milk to Dr. Sunita Reddy (Kavuri Hills). Paid via UPI: ₹90.',
    type: 'delivery_completed',
    isRead: false,
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    recipientRole: 'admin',
    recipientId: '',
    title: '📦 New Route Generated',
    message: 'Daily dispatch route generated for today: 5 planned deliveries assigned across Madhapur depot.',
    type: 'route_update',
    isRead: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    recipientRole: 'customer',
    recipientId: '',
    title: '🥛 Morning Milk Dispatched',
    message: 'Your 1.5L Farm Fresh Cow Milk is out for doorstep delivery with delivery partner Naveen Kumar.',
    type: 'delivery_assigned',
    isRead: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    recipientRole: 'customer',
    recipientId: '',
    title: '✅ Doorstep Delivery Completed',
    message: 'Your morning milk pouch was delivered safely into your doorstep bag at 06:15 AM.',
    type: 'delivery_completed',
    isRead: false,
    createdAt: new Date(Date.now() - 50 * 60 * 1000),
  },
  {
    recipientRole: 'customer',
    recipientId: '',
    title: '🌿 100% Pure & Chilled Batch',
    message: 'Today\'s batch chilled at 3.8°C with uncompromised natural freshness and zero adulteration.',
    type: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 120 * 60 * 1000),
  },
];

let memoryNotifications = [...defaultSeedNotifications];
let hasSeededDB = false;

const getUserNotificationScope = (user) => {
  const ids = [user.id, user.customerId, user.boyId].filter(Boolean);
  return {
    $or: [
      { recipientRole: user.role },
      { recipientRole: 'all' },
      ...(ids.length ? [{ recipientId: { $in: ids } }] : []),
    ],
  };
};

const canAccessNotification = (notification, user) => {
  if (user.role === 'admin') return true;
  const ids = [user.id, user.customerId, user.boyId].filter(Boolean).map(String);
  return (
    notification.recipientRole === user.role ||
    notification.recipientRole === 'all' ||
    ids.includes(String(notification.recipientId || ''))
  );
};

const getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    const filter = role === 'admin' ? {} : getUserNotificationScope(req.user);

    let list = [];
    let isDbConnected = false;

    try {
      if (!hasSeededDB) {
        hasSeededDB = true;
        const count = await Notification.countDocuments();
        if (count === 0) {
          await Notification.insertMany(defaultSeedNotifications);
        }
      }
      list = await Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean();
      isDbConnected = true;
    } catch (dbErr) {
      list = [];
      isDbConnected = false;
    }

    // Only fallback to in-memory store if DB query failed
    if (!isDbConnected) {
      list = memoryNotifications.filter((n) => canAccessNotification(n, req.user));
    }

    // Format list with consistent ID and type
    list = list.map((n) => {
      const rawType = n.data?.originalType || n.type;
      const notifId = n._id ? n._id.toString() : (n.id || '');
      return {
        ...n,
        type: rawType,
        id: notifId,
        _id: notifId,
      };
    });

    const unreadCount = list.filter((n) => !n.isRead).length;

    return res.json({
      success: true,
      unreadCount,
      notifications: list,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { recipientRole, recipientId, title, message, type, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const itemData = {
      recipientRole: recipientRole || 'all',
      recipientId: recipientId || '',
      title,
      message,
      type: type || 'system',
      data: data || {},
      isRead: false,
      createdAt: new Date(),
    };

    let savedItem;
    try {
      savedItem = await Notification.create(itemData);
      savedItem = savedItem.toObject();
    } catch (dbErr) {
      try {
        const fallbackItem = {
          ...itemData,
          type: 'system',
          data: { ...itemData.data, originalType: itemData.type },
        };
        const createdFallback = await Notification.create(fallbackItem);
        savedItem = {
          ...createdFallback.toObject(),
          type: itemData.type,
        };
      } catch (retryErr) {
        savedItem = { ...itemData, id: 'mem_' + Date.now() };
      }
      memoryNotifications.unshift(savedItem);
    }

    const finalId = savedItem._id ? savedItem._id.toString() : savedItem.id;
    const formattedNotification = {
      ...savedItem,
      type: itemData.type,
      id: finalId,
      _id: finalId,
    };

    // Realtime broadcast to all portals
    broadcast('NOTIFICATION_CREATED', formattedNotification);
    broadcast('NOTIFICATION_UPDATED', { action: 'created', notification: formattedNotification });

    return res.status(201).json({
      success: true,
      notification: formattedNotification,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID required' });

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const idFilter = isObjectId ? { $or: [{ _id: id }, { id }] } : { id };

    try {
      await Notification.updateMany(idFilter, { isRead: true });
    } catch (dbErr) {
      console.warn('markAsRead DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.map((n) => {
      const match = (n._id && n._id.toString() === id) || (n.id && String(n.id) === String(id));
      return match ? { ...n, isRead: true } : n;
    });

    broadcast('NOTIFICATION_UPDATED', { action: 'read', id });

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : getUserNotificationScope(req.user);

    try {
      await Notification.updateMany(filter, { isRead: true });
    } catch (dbErr) {
      console.warn('markAllAsRead DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.map((n) => {
      return canAccessNotification(n, req.user) ? { ...n, isRead: true } : n;
    });

    broadcast('NOTIFICATION_UPDATED', { action: 'read_all', role: req.user.role });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : getUserNotificationScope(req.user);

    try {
      await Notification.deleteMany(filter);
    } catch (dbErr) {
      console.warn('clearAll DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.filter((n) => {
      return !canAccessNotification(n, req.user);
    });

    // Realtime broadcast permanent clearing to all dashboards & mobile apps
    broadcast('NOTIFICATIONS_CLEARED', { role: req.user.role, userId: req.user.id });
    broadcast('NOTIFICATION_UPDATED', { action: 'clear_all', role: req.user.role });

    return res.json({ success: true, message: 'All notifications permanently deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID required' });

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const idFilter = isObjectId ? { $or: [{ _id: id }, { id }] } : { id };

    const queryFilter = req.user.role === 'admin'
      ? idFilter
      : { ...idFilter, ...getUserNotificationScope(req.user) };

    try {
      await Notification.deleteMany(queryFilter);
    } catch (dbErr) {
      console.warn('deleteNotification DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.filter((n) => {
      const match = (n._id && n._id.toString() === id) || (n.id && String(n.id) === String(id));
      return !match;
    });

    // Realtime broadcast permanent deletion to all dashboards & mobile apps
    broadcast('NOTIFICATION_DELETED', { id });
    broadcast('NOTIFICATION_UPDATED', { action: 'delete', id });

    return res.json({ success: true, message: 'Notification permanently deleted', id });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  clearAll,
  deleteNotification,
};
