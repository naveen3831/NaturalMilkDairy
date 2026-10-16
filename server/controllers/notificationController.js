const Notification = require('../models/Notification');
const { broadcast } = require('../config/websocket');

// Default initial notifications to seed if collection is empty
const defaultSeedNotifications = [
  {
    recipientRole: 'delivery_boy',
    recipientId: '',
    title: '📦 Shift Route Assigned',
    message: 'Dispatch Admin assigned your morning route with 5 customer doorstep deliveries in Madhapur.',
    type: 'delivery_assigned',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
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
    createdAt: new Date(Date.now() - 8 * 60 * 1000), // 8 mins ago
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

// In-memory fallback if MongoDB is not reachable
let memoryNotifications = [...defaultSeedNotifications];
let hasSeededDB = false;

const getNotifications = async (req, res) => {
  try {
    const { role, userId } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.$or = [
        { recipientRole: role },
        { recipientRole: 'all' },
      ];
      if (userId) {
        filter.$or.push({ recipientId: userId });
      }
    }

    let list = [];
    try {
      if (!hasSeededDB) {
        hasSeededDB = true;
        const count = await Notification.countDocuments();
        if (count === 0) {
          await Notification.insertMany(defaultSeedNotifications);
        }
      }
      list = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    } catch (dbErr) {
      list = [];
    }

    // Always merge in-memory notifications matching filter
    const memMatching = memoryNotifications.filter((n) => {
      if (!role || role === 'all') return true;
      return n.recipientRole === role || n.recipientRole === 'all' || (userId && n.recipientId === userId);
    });

    const existingIds = new Set(list.map((n) => (n._id ? n._id.toString() : n.id)));
    for (const memItem of memMatching) {
      const memId = memItem._id ? memItem._id.toString() : memItem.id;
      if (!existingIds.has(memId)) {
        list.unshift(memItem);
        existingIds.add(memId);
      }
    }

    // Restore originalType if stored inside data
    list = list.map((n) => {
      const rawType = n.data?.originalType || n.type;
      return {
        ...n,
        type: rawType,
        id: n._id ? n._id.toString() : (n.id || Math.random().toString(36).substr(2, 9)),
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
    } catch (dbErr) {
      try {
        // Retry with system type if enum failed
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

    broadcast('NOTIFICATION_UPDATED', {});

    return res.status(201).json({
      success: true,
      notification: {
        ...savedItem,
        type: itemData.type,
        id: savedItem._id ? savedItem._id.toString() : savedItem.id,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      if (id.length === 24) {
        await Notification.findByIdAndUpdate(id, { isRead: true });
      }
    } catch (e) {}

    memoryNotifications = memoryNotifications.map((n) =>
      (n.id === id || (n._id && n._id.toString() === id)) ? { ...n, isRead: true } : n
    );

    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { role, userId } = req.body;
    const filter = {};
    if (role && role !== 'all') {
      filter.$or = [{ recipientRole: role }, { recipientRole: 'all' }];
      if (userId) filter.$or.push({ recipientId: userId });
    }

    try {
      await Notification.updateMany(filter, { isRead: true });
    } catch (e) {}

    memoryNotifications = memoryNotifications.map((n) => {
      if (!role || role === 'all' || n.recipientRole === role || n.recipientRole === 'all') {
        return { ...n, isRead: true };
      }
      return n;
    });

    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const { role, userId } = req.query;
    const filter = {};
    if (role && role !== 'all') {
      filter.$or = [{ recipientRole: role }, { recipientRole: 'all' }];
      if (userId) filter.$or.push({ recipientId: userId });
    }

    try {
      await Notification.deleteMany(filter);
    } catch (e) {}

    memoryNotifications = memoryNotifications.filter((n) => {
      if (!role || role === 'all') return false;
      return n.recipientRole !== role && n.recipientRole !== 'all';
    });

    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({ success: true, message: 'Notifications cleared' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      if (id.length === 24) {
        await Notification.findByIdAndDelete(id);
      }
    } catch (e) {}

    memoryNotifications = memoryNotifications.filter((n) =>
      n.id !== id && (!n._id || n._id.toString() !== id)
    );

    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({ success: true, message: 'Notification deleted' });
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
