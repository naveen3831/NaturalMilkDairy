const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true },
  actor: { type: String, default: 'Admin' },
  details: { type: String, default: '' },
  category: { type: String, enum: ['delivery', 'payment', 'customer', 'price', 'system'], default: 'system' },
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
