const Customer = require('../models/Customer');
const User = require('../models/User');

const escapeRegex = (text) => (typeof text === 'string' ? text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') : '');

/**
 * Robust customer resolver that handles:
 * - 'me'
 * - Customer ID (e.g. 'DJS143A4', 'CUST-101', etc. case-insensitive)
 * - Mongo ObjectId (24 hex)
 * - Mobile number (normalized to 10 digits)
 * - Email address
 * - Authenticated JWT user payload
 */
const findCustomerForRequest = async (req) => {
  if (!req) return null;
  const reqId = req.params?.id || req.query?.customerId || req.query?.id;
  const user = req.user;

  // 1. If an explicit customer identifier was provided and it's NOT 'me'
  if (reqId && reqId !== 'me') {
    const cleanId = String(reqId).trim();
    const isObjectId = /^[a-f\d]{24}$/i.test(cleanId);
    const cleanDigits = cleanId.replace(/\D/g, '').slice(-10);

    const conditions = [
      { customerId: cleanId },
      { customerId: { $regex: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') } },
      ...(isObjectId ? [{ _id: cleanId }] : []),
      ...(cleanDigits.length === 10 ? [{ mobile: { $regex: cleanDigits + '$' } }] : []),
    ];

    let found = await Customer.findOne({ $or: conditions }).lean();
    if (found) return found;
  }

  // 2. Resolve from authenticated user (or if reqId === 'me' / omitted)
  if (user) {
    const isUserObjectId = user.id && /^[a-f\d]{24}$/i.test(user.id);
    const userPhoneClean = (user.mobile || '').replace(/\D/g, '').slice(-10);
    const userEmailClean = (user.email || '').trim().toLowerCase();

    const candidates = [
      ...(user.customerId ? [
        { customerId: user.customerId },
        { customerId: { $regex: new RegExp(`^${escapeRegex(user.customerId)}$`, 'i') } },
      ] : []),
      ...(isUserObjectId ? [{ _id: user.id }] : []),
      ...(userPhoneClean.length === 10 ? [{ mobile: { $regex: userPhoneClean + '$' } }] : []),
      ...(userEmailClean ? [{ email: { $regex: new RegExp(`^${escapeRegex(userEmailClean)}$`, 'i') } }] : []),
    ];

    if (candidates.length) {
      let found = await Customer.findOne({ $or: candidates }).lean();
      if (found) return found;
    }

    // Check User model if user.id is a User collection _id
    if (isUserObjectId) {
      const userDoc = await User.findById(user.id).lean();
      if (userDoc) {
        const uPhoneClean = (userDoc.mobile || '').replace(/\D/g, '').slice(-10);
        const uEmailClean = (userDoc.email || '').trim().toLowerCase();
        const uCustId = userDoc.customerId;
        const uCandidates = [
          ...(uCustId ? [{ customerId: uCustId }, { customerId: { $regex: new RegExp(`^${escapeRegex(uCustId)}$`, 'i') } }] : []),
          ...(uPhoneClean.length === 10 ? [{ mobile: { $regex: uPhoneClean + '$' } }] : []),
          ...(uEmailClean ? [{ email: { $regex: new RegExp(`^${escapeRegex(uEmailClean)}$`, 'i') } }] : []),
        ];
        if (uCandidates.length) {
          let found = await Customer.findOne({ $or: uCandidates }).lean();
          if (found) {
            // Self-repair: update User document with customerId if missing
            if (found.customerId && !userDoc.customerId) {
              User.updateOne({ _id: userDoc._id }, { $set: { customerId: found.customerId } }).catch(() => {});
            }
            return found;
          }
        }
      }
    }
  }

  return null;
};

module.exports = {
  escapeRegex,
  findCustomerForRequest,
};
