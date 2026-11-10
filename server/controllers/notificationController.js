const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { broadcast } = require('../config/websocket');

// Default initial notifications to seed if collection is truly brand new
const defaultSeedNotifications = [
  {
    recipientRole: 'delivery_boy',
    recipientId: '',
    title: '📦 Shift Route Assigned',
    message: 'Dispatch Admin assigned your morning route with planned customer doorstep deliveries.',
    type: 'delivery_assigned',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    recipientRole: 'delivery_boy',
    recipientId: '',
    title: '⏰ Shift Start Reminder',
    message: 'Morning delivery window begins at 04:30 AM. Please verify vehicle battery and crate counts.',
    type: 'system',
    isRead: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    recipientRole: 'admin',
    recipientId: '',
    title: '📦 Operations Center Online',
    message: 'Daily dispatch route generator ready. Real-time fleet tracking active.',
    type: 'route_update',
    isRead: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    recipientRole: 'all',
    recipientId: '',
    title: '🌿 100% Pure & Fresh Dairy',
    message: 'Farm-fresh milk chilled to 4°C with zero adulteration and authentic morning doorstep delivery.',
    type: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 120 * 60 * 1000),
  },
];

let memoryNotifications = [...defaultSeedNotifications];
let hasSeededDB = false;

// Resolve all possible user identifiers (User _id, Customer _id, customerId, mobile, email)
const resolveUserIdentifiers = async (user) => {
  const rawId = (user.id || user._id || '').toString().trim();
  const ids = new Set();
  if (rawId) ids.add(rawId);
  if (user.customerId && String(user.customerId).trim()) ids.add(String(user.customerId).trim());
  if (user.boyId && String(user.boyId).trim()) ids.add(String(user.boyId).trim());
  if (user.mobile && String(user.mobile).trim()) ids.add(String(user.mobile).trim());
  if (user.email && String(user.email).trim()) ids.add(String(user.email).trim().toLowerCase());

  if (user.role === 'customer' || user.role === 'user') {
    // Always look up the Customer document to grab Customer._id and Customer.customerId
    try {
      const Customer = mongoose.models.Customer || require('../models/Customer');
      const orClauses = [];
      if (rawId && rawId.length === 24) orClauses.push({ _id: rawId });
      if (user.customerId && String(user.customerId).trim()) orClauses.push({ customerId: String(user.customerId).trim() });
      if (user.mobile && String(user.mobile).trim().length >= 10) orClauses.push({ mobile: String(user.mobile).trim() });
      if (user.email && String(user.email).trim()) orClauses.push({ email: String(user.email).trim().toLowerCase() });

      if (orClauses.length > 0) {
        const customer = await Customer.findOne({ $or: orClauses }).maxTimeMS(2000).lean();
        if (customer) {
          if (customer._id) ids.add(customer._id.toString());
          if (customer.customerId) ids.add(String(customer.customerId).trim());
          if (customer.mobile) ids.add(String(customer.mobile).trim());
          if (customer.email) ids.add(String(customer.email).trim().toLowerCase());
        }
      }
    } catch (err) {
      console.warn('Customer resolution note:', err.message);
    }
  } else if (user.role === 'delivery_boy') {
    if (!user.boyId) {
      try {
        const DeliveryBoy = mongoose.models.DeliveryBoy || require('../models/DeliveryBoy');
        const boy = await DeliveryBoy.findOne({
          $or: [
            ...(rawId && rawId.length === 24 ? [{ _id: rawId }] : []),
            ...(user.mobile ? [{ mobile: user.mobile }] : []),
          ],
        }).maxTimeMS(2000).lean();
        if (boy) {
          if (boy._id) ids.add(boy._id.toString());
          if (boy.boyId) ids.add(String(boy.boyId).trim());
          if (boy.mobile) ids.add(String(boy.mobile).trim());
        }
      } catch (err) {
        console.warn('Driver resolution note:', err.message);
      }
    }
  }

  return Array.from(ids).map((id) => String(id).trim()).filter(Boolean);
};

// Build strictly user-scoped MongoDB query
const getUserNotificationScope = async (user) => {
  if (user.role === 'admin') {
    return {
      $or: [
        { recipientRole: 'admin' },
        { recipientRole: 'all' },
        { recipientRole: { $exists: false } },
      ],
    };
  }

  const ids = await resolveUserIdentifiers(user);

  if (user.role === 'customer' || user.role === 'user') {
    const validIds = ids.filter((id) => id && typeof id === 'string' && id.trim().length > 0);
    if (validIds.length === 0) {
      return { recipientRole: 'all' };
    }
    return {
      $or: [
        {
          recipientRole: 'customer',
          recipientId: { $in: validIds },
        },
        {
          recipientRole: 'all',
        },
      ],
    };
  }

  if (user.role === 'delivery_boy') {
    return {
      $or: [
        {
          recipientRole: 'delivery_boy',
          $or: [
            { recipientId: { $in: ids } },
            { recipientId: '' },
            { recipientId: null },
            { recipientId: { $exists: false } },
          ],
        },
        {
          recipientRole: 'all',
        },
      ],
    };
  }

  return { recipientRole: 'none' };
};

const canAccessNotification = (notification, user, ids = []) => {
  if (notification.recipientRole === 'all') return true;

  const targetId = String(notification.recipientId || '').trim();

  if (user.role === 'admin') {
    if (notification.recipientRole === 'admin' || !notification.recipientRole) return true;
    return false;
  }

  if (user.role === 'customer' || user.role === 'user') {
    if (notification.recipientRole !== 'customer') return false;
    if (!targetId) return false;
    return ids.includes(targetId);
  }

  if (user.role === 'delivery_boy') {
    if (notification.recipientRole !== 'delivery_boy') return false;
    if (!targetId) return true; // General driver broadcast
    return ids.includes(targetId);
  }

  return false;
};

const getNotifications = async (req, res) => {
  try {
    const ids = await resolveUserIdentifiers(req.user);
    const filter = await getUserNotificationScope(req.user);

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
      list = memoryNotifications.filter((n) => canAccessNotification(n, req.user, ids));
    }

    // Double check: Strictly ensure only accessible notifications reach the response
    list = list.filter((n) => canAccessNotification(n, req.user, ids));

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
    const ids = await resolveUserIdentifiers(req.user);
    const filter = await getUserNotificationScope(req.user);

    try {
      await Notification.updateMany(filter, { isRead: true });
    } catch (dbErr) {
      console.warn('markAllAsRead DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.map((n) => {
      return canAccessNotification(n, req.user, ids) ? { ...n, isRead: true } : n;
    });

    broadcast('NOTIFICATION_UPDATED', { action: 'read_all', role: req.user.role });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const ids = await resolveUserIdentifiers(req.user);
    const filter = await getUserNotificationScope(req.user);

    try {
      await Notification.deleteMany(filter);
    } catch (dbErr) {
      console.warn('clearAll DB warning:', dbErr.message);
    }

    memoryNotifications = memoryNotifications.filter((n) => {
      return !canAccessNotification(n, req.user, ids);
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

    const userScope = await getUserNotificationScope(req.user);
    const queryFilter = req.user.role === 'admin'
      ? idFilter
      : { ...idFilter, ...userScope };

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
