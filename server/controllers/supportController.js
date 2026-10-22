const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { broadcast } = require('../config/websocket');

// Default initial support seeds
const defaultSeedTickets = [
  {
    ticketId: 'TKT-1081',
    senderRole: 'delivery_boy',
    senderId: 'usr_boy_1',
    senderName: 'Naveen Kumar',
    senderPhone: '9701878789',
    senderEmail: 'naveenkumar970100@gmail.com',
    senderArea: 'Madhapur',
    senderAddress: 'Madhapur Farm Dispatch Depot',
    category: 'Route & Delivery',
    priority: 'normal',
    status: 'open',
    subject: '🚚 Partner Route Assistance: Stop #3 Access',
    message: 'Gate code 4022 for Stop #3 customer building was changed. Need dispatch to verify with customer.',
    adminReply: '',
    adminNotes: '',
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    ticketId: 'TKT-1082',
    senderRole: 'customer',
    senderId: 'CUST-101',
    senderName: 'K. Rajesh Varma',
    senderPhone: '9876543210',
    senderEmail: 'rajesh.varma@gmail.com',
    senderArea: 'Madhapur',
    senderAddress: 'Flat 402, Sai Teja Residency, Madhapur',
    category: 'Morning Delivery Delay',
    priority: 'high',
    status: 'in_progress',
    subject: '🥛 Delivery Timing Query',
    message: 'Please ensure delivery before 6:00 AM tomorrow as we have an early morning flight.',
    adminReply: 'Notified partner Naveen to prioritize your flat as first drop at 5:15 AM.',
    adminNotes: 'Assigned as priority stop #1 for tomorrow dispatch',
    createdAt: new Date(Date.now() - 35 * 60 * 1000),
  },
  {
    ticketId: 'TKT-1083',
    senderRole: 'delivery_boy',
    senderId: 'usr_boy_2',
    senderName: 'Rahul Sharma',
    senderPhone: '9876543212',
    senderEmail: 'rahul@naturalmilkdairy.com',
    senderArea: 'Kavuri Hills',
    senderAddress: 'Kavuri Hills Depot',
    category: 'Milk Shortage',
    priority: 'urgent',
    status: 'resolved',
    subject: '🥛 Restock Request: 5L Extra A2 Milk',
    message: 'Customer requested 5L additional fresh milk at Pillar 18. Crates dispatched from depot.',
    adminReply: 'Extra crates handed over at Madhapur junction at 5:35 AM.',
    adminNotes: 'Stock balanced in depot ledger',
    resolvedAt: new Date(Date.now() - 15 * 60 * 1000),
    createdAt: new Date(Date.now() - 65 * 60 * 1000),
  },
];

let memoryTickets = [...defaultSeedTickets];

const getSupportTickets = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.senderRole = role;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    let list = [];
    try {
      const count = await SupportTicket.countDocuments();
      if (count === 0) {
        await SupportTicket.insertMany(defaultSeedTickets);
      }
      list = await SupportTicket.find(filter).sort({ createdAt: -1 }).lean();
    } catch (err) {
      list = memoryTickets.filter((t) => {
        if (role && role !== 'all' && t.senderRole !== role) return false;
        if (status && status !== 'all' && t.status !== status) return false;
        return true;
      });
    }

    // Combine any memory tickets not yet in MongoDB
    const existingIds = new Set(list.map((t) => t.ticketId || t._id?.toString()));
    for (const mem of memoryTickets) {
      if (!existingIds.has(mem.ticketId) && (!role || role === 'all' || mem.senderRole === role) && (!status || status === 'all' || mem.status === status)) {
        list.unshift(mem);
        existingIds.add(mem.ticketId);
      }
    }

    // Filter by search query if present
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        (t.senderName || '').toLowerCase().includes(q) ||
        (t.senderPhone || '').includes(q) ||
        (t.ticketId || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.message || '').toLowerCase().includes(q) ||
        (t.senderArea || '').toLowerCase().includes(q)
      );
    }

    const openCount = list.filter((t) => t.status === 'open').length;
    const inProgressCount = list.filter((t) => t.status === 'in_progress').length;
    const resolvedCount = list.filter((t) => t.status === 'resolved').length;

    return res.json({
      success: true,
      total: list.length,
      openCount,
      inProgressCount,
      resolvedCount,
      tickets: list.map((t) => ({
        ...t,
        id: t._id ? t._id.toString() : t.ticketId,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createSupportTicket = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Support details must be an object.' });
    }
    const {
      senderName,
      senderPhone,
      senderEmail,
      senderArea,
      senderAddress,
      category,
      priority,
      subject,
      message,
    } = req.body;

    if (typeof message !== 'string' || !message.trim() || message.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Message must be between 1 and 5000 characters.' });
    }
    const limits = [
      [senderName, 80, 'Sender name'],
      [senderPhone, 20, 'Phone number'],
      [senderEmail, 254, 'Email address'],
      [senderArea, 100, 'Area'],
      [senderAddress, 250, 'Address'],
      [category, 80, 'Category'],
      [subject, 150, 'Subject'],
    ];
    for (const [value, maxLength, label] of limits) {
      if (value !== undefined && (typeof value !== 'string' || value.length > maxLength)) {
        return res.status(400).json({ success: false, message: `${label} must be at most ${maxLength} characters.` });
      }
    }

    const ticketId = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
    const resolvedRole = req.user?.role === 'delivery_boy' ? 'delivery_boy' : 'customer';

    const ticketData = {
      ticketId,
      senderRole: resolvedRole,
      senderId: req.user?.id || req.user?.customerId || '',
      senderName: req.user?.name || senderName || (resolvedRole === 'delivery_boy' ? 'Delivery Partner' : 'Customer'),
      senderPhone: req.user?.mobile || senderPhone || '',
      senderEmail: req.user?.email || senderEmail || '',
      senderArea: senderArea || 'Madhapur',
      senderAddress: senderAddress || '',
      category: category || 'General Support',
      priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
      status: 'open',
      subject: subject || `${resolvedRole === 'delivery_boy' ? '🚚 Driver' : '🥛 Customer'} Help: ${category || 'Query'}`,
      message: message.trim(),
      adminReply: '',
      adminNotes: '',
      createdAt: new Date(),
    };

    let savedTicket;
    try {
      savedTicket = await SupportTicket.create(ticketData);
    } catch (err) {
      savedTicket = { ...ticketData, _id: 'mem_' + Date.now(), id: ticketId };
      memoryTickets.unshift(savedTicket);
    }

    // Also create a companion notification for Admin
    try {
      const notifData = {
        recipientRole: 'admin',
        recipientId: '',
        title: `${resolvedRole === 'delivery_boy' ? '🚚 Driver Message' : '🥛 Customer Message'} (${ticketData.senderName}): ${ticketData.category}`,
        message: `[${ticketData.priority.toUpperCase()}] ${ticketData.message}\nSender: ${ticketData.senderName} (${ticketData.senderPhone}) · Area: ${ticketData.senderArea}`,
        type: resolvedRole === 'delivery_boy' ? 'partner_message' : 'customer_message',
        data: {
          ticketId,
          senderRole: resolvedRole,
          senderName: ticketData.senderName,
          senderPhone: ticketData.senderPhone,
          category: ticketData.category,
          priority: ticketData.priority,
          message: ticketData.message,
        },
        isRead: false,
        createdAt: new Date(),
      };

      try {
        await Notification.create(notifData);
      } catch (notifErr) {
        // Fallback with system type
        try {
          await Notification.create({ ...notifData, type: 'system' });
        } catch (e2) {}
      }
    } catch (e) {
      console.warn('Error creating companion notification:', e);
    }

    broadcast('SUPPORT_TICKET_CREATED', { ticket: savedTicket });
    broadcast('NOTIFICATION_UPDATED', {});

    return res.status(201).json({
      success: true,
      ticket: {
        ...savedTicket,
        id: savedTicket._id ? savedTicket._id.toString() : ticketId,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply, adminNotes } = req.body;

    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
      }
    }
    if (adminReply !== undefined) updates.adminReply = adminReply;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    let updatedTicket = null;
    try {
      if (id.length === 24) {
        updatedTicket = await SupportTicket.findByIdAndUpdate(id, updates, { new: true });
      }
      if (!updatedTicket) {
        updatedTicket = await SupportTicket.findOneAndUpdate({ ticketId: id }, updates, { new: true });
      }
    } catch (err) {}

    // Update in memory if needed
    memoryTickets = memoryTickets.map((t) => {
      if (t.ticketId === id || (t._id && t._id.toString() === id)) {
        return { ...t, ...updates };
      }
      return t;
    });

    broadcast('SUPPORT_TICKET_UPDATED', { id, updates });

    return res.json({
      success: true,
      ticket: updatedTicket || updates,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      if (id.length === 24) {
        await SupportTicket.findByIdAndDelete(id);
      }
      await SupportTicket.findOneAndDelete({ ticketId: id });
    } catch (err) {}

    memoryTickets = memoryTickets.filter((t) => t.ticketId !== id && (!t._id || t._id.toString() !== id));

    broadcast('SUPPORT_TICKET_DELETED', { id });

    return res.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
};
