const AuditLog = require('../models/AuditLog');

const recordAudit = async (action, actor = 'Admin', details = '', category = 'system') => {
  try {
    await AuditLog.create({
      action,
      actor: actor || 'Admin',
      details: details || '',
      category: category || 'system',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('AuditLog record note:', err.message);
  }
};

module.exports = { recordAudit };
