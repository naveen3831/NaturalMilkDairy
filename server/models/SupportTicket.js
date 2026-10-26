const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      default: () => 'TKT-' + Math.floor(1000 + Math.random() * 9000),
    },
    senderRole: {
      type: String,
      enum: ['delivery_boy', 'customer', 'driver'],
      required: true,
      default: 'customer',
    },
    senderId: {
      type: String,
      default: '',
    },
    senderName: {
      type: String,
      required: true,
      default: 'User',
    },
    senderPhone: {
      type: String,
      default: '',
    },
    senderEmail: {
      type: String,
      default: '',
    },
    senderArea: {
      type: String,
      default: '',
    },
    senderAddress: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      default: 'General Support',
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
    subject: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
    },
    adminReply: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['customer', 'admin', 'delivery_boy', 'driver'],
          default: 'customer',
        },
        senderName: {
          type: String,
          default: '',
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
