const ContactInfo = require('../models/ContactInfo');
const { broadcast } = require('../config/websocket');

const DEFAULT_CONTACT_INFO = {
  companyName: 'NATURAL MILK DAIRY PRIVATE LIMITED',
  tagline: 'Natural • Pure • Healthy',
  description:
    'Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai.',
  address:
    'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400053',
  phone: '+91 98765 43210',
  cleanPhone: '919876543210',
  email: 'care@naturalmilkdairy.com',
  whatsapp: '+91 98765 43210',
  workingHours: '5:00 AM – 9:00 PM Daily (365 Days)',
  deliveryHours: '5:00 AM – 6:30 AM Doorstep Drop',
  socialLinks: {
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    linkedin: 'https://linkedin.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
  },
  isPrimary: true,
  isActive: true,
  updatedBy: 'System Default',
};

// Ensure default contact info exists
const ensureDefaultContactInfo = async () => {
  try {
    const existing = await ContactInfo.findOne({ isPrimary: true });
    if (!existing) {
      const created = await ContactInfo.create(DEFAULT_CONTACT_INFO);
      return created;
    }
    return existing;
  } catch (err) {
    console.error('Error ensuring default contact info:', err.message);
    return null;
  }
};

/**
 * Helper: clean phone string to pure digits
 */
const sanitizeCleanPhone = (phoneStr = '') => {
  const digits = String(phoneStr).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits || '919876543210';
};

/**
 * Public: Get active primary contact info & social links
 * GET /api/contact-info
 */
exports.getPrimaryContactInfo = async (req, res) => {
  try {
    let contactInfo = await ContactInfo.findOne({ isPrimary: true, isActive: true });
    if (!contactInfo) {
      contactInfo = await ensureDefaultContactInfo();
    }
    return res.json({
      success: true,
      contactInfo: contactInfo || DEFAULT_CONTACT_INFO,
    });
  } catch (err) {
    console.error('getPrimaryContactInfo error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to load contact information',
      contactInfo: DEFAULT_CONTACT_INFO,
    });
  }
};

/**
 * Admin: Get all contact info records
 * GET /api/contact-info/all
 */
exports.getAllContactInfos = async (req, res) => {
  try {
    await ensureDefaultContactInfo();
    const records = await ContactInfo.find().sort({ isPrimary: -1, createdAt: -1 });
    return res.json({
      success: true,
      records,
    });
  } catch (err) {
    console.error('getAllContactInfos error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch contact records' });
  }
};

/**
 * Admin: Get single contact info by ID
 * GET /api/contact-info/:id
 */
exports.getContactInfoById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ContactInfo.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Contact info record not found' });
    }
    return res.json({ success: true, record });
  } catch (err) {
    console.error('getContactInfoById error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch record' });
  }
};

/**
 * Admin: Create new contact info / branch entry
 * POST /api/contact-info
 */
exports.createContactInfo = async (req, res) => {
  try {
    const payload = req.body || {};
    const cleanPhone = payload.cleanPhone || sanitizeCleanPhone(payload.phone || payload.whatsapp);

    const record = new ContactInfo({
      companyName: payload.companyName || DEFAULT_CONTACT_INFO.companyName,
      tagline: payload.tagline || DEFAULT_CONTACT_INFO.tagline,
      description: payload.description || DEFAULT_CONTACT_INFO.description,
      address: payload.address || DEFAULT_CONTACT_INFO.address,
      city: payload.city || DEFAULT_CONTACT_INFO.city,
      state: payload.state || DEFAULT_CONTACT_INFO.state,
      pincode: payload.pincode || DEFAULT_CONTACT_INFO.pincode,
      phone: payload.phone || DEFAULT_CONTACT_INFO.phone,
      cleanPhone,
      email: payload.email || DEFAULT_CONTACT_INFO.email,
      whatsapp: payload.whatsapp || payload.phone || DEFAULT_CONTACT_INFO.whatsapp,
      workingHours: payload.workingHours || DEFAULT_CONTACT_INFO.workingHours,
      deliveryHours: payload.deliveryHours || DEFAULT_CONTACT_INFO.deliveryHours,
      socialLinks: {
        facebook: payload.socialLinks?.facebook ?? DEFAULT_CONTACT_INFO.socialLinks.facebook,
        twitter: payload.socialLinks?.twitter ?? DEFAULT_CONTACT_INFO.socialLinks.twitter,
        linkedin: payload.socialLinks?.linkedin ?? DEFAULT_CONTACT_INFO.socialLinks.linkedin,
        instagram: payload.socialLinks?.instagram ?? DEFAULT_CONTACT_INFO.socialLinks.instagram,
        youtube: payload.socialLinks?.youtube ?? DEFAULT_CONTACT_INFO.socialLinks.youtube,
      },
      isPrimary: Boolean(payload.isPrimary),
      isActive: payload.isActive !== false,
      updatedBy: req.user?.name || req.user?.email || 'Admin',
    });

    if (record.isPrimary) {
      await ContactInfo.updateMany({ _id: { $ne: record._id } }, { isPrimary: false });
    }

    const saved = await record.save();

    // Broadcast real-time update
    broadcast('CONTACT_INFO_UPDATED', { contactInfo: saved });

    return res.status(201).json({
      success: true,
      message: 'Contact information created successfully',
      contactInfo: saved,
    });
  } catch (err) {
    console.error('createContactInfo error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create contact information' });
  }
};

/**
 * Admin: Update primary contact details & social links
 * PUT /api/contact-info
 */
exports.updatePrimaryContactInfo = async (req, res) => {
  try {
    const payload = req.body || {};
    let contactInfo = await ContactInfo.findOne({ isPrimary: true });
    if (!contactInfo) {
      contactInfo = await ensureDefaultContactInfo();
    }

    if (payload.companyName !== undefined) contactInfo.companyName = payload.companyName;
    if (payload.tagline !== undefined) contactInfo.tagline = payload.tagline;
    if (payload.description !== undefined) contactInfo.description = payload.description;
    if (payload.address !== undefined) contactInfo.address = payload.address;
    if (payload.city !== undefined) contactInfo.city = payload.city;
    if (payload.state !== undefined) contactInfo.state = payload.state;
    if (payload.pincode !== undefined) contactInfo.pincode = payload.pincode;
    if (payload.phone !== undefined) {
      contactInfo.phone = payload.phone;
      contactInfo.cleanPhone = sanitizeCleanPhone(payload.phone);
    }
    if (payload.cleanPhone !== undefined) contactInfo.cleanPhone = payload.cleanPhone;
    if (payload.email !== undefined) contactInfo.email = payload.email;
    if (payload.whatsapp !== undefined) contactInfo.whatsapp = payload.whatsapp;
    if (payload.workingHours !== undefined) contactInfo.workingHours = payload.workingHours;
    if (payload.deliveryHours !== undefined) contactInfo.deliveryHours = payload.deliveryHours;

    if (payload.socialLinks && typeof payload.socialLinks === 'object') {
      contactInfo.socialLinks = {
        facebook: payload.socialLinks.facebook !== undefined ? payload.socialLinks.facebook : contactInfo.socialLinks?.facebook,
        twitter: payload.socialLinks.twitter !== undefined ? payload.socialLinks.twitter : contactInfo.socialLinks?.twitter,
        linkedin: payload.socialLinks.linkedin !== undefined ? payload.socialLinks.linkedin : contactInfo.socialLinks?.linkedin,
        instagram: payload.socialLinks.instagram !== undefined ? payload.socialLinks.instagram : contactInfo.socialLinks?.instagram,
        youtube: payload.socialLinks.youtube !== undefined ? payload.socialLinks.youtube : contactInfo.socialLinks?.youtube,
      };
    }

    contactInfo.updatedBy = req.user?.name || req.user?.email || 'Admin Desk';
    const updated = await contactInfo.save();

    // Broadcast real-time update
    broadcast('CONTACT_INFO_UPDATED', { contactInfo: updated });

    return res.json({
      success: true,
      message: 'Contact details & social media links updated successfully',
      contactInfo: updated,
    });
  } catch (err) {
    console.error('updatePrimaryContactInfo error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update contact info' });
  }
};

/**
 * Admin: Update specific contact info by ID
 * PUT /api/contact-info/:id
 */
exports.updateContactInfoById = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const contactInfo = await ContactInfo.findById(id);
    if (!contactInfo) {
      return res.status(404).json({ success: false, message: 'Contact info record not found' });
    }

    if (payload.companyName !== undefined) contactInfo.companyName = payload.companyName;
    if (payload.tagline !== undefined) contactInfo.tagline = payload.tagline;
    if (payload.description !== undefined) contactInfo.description = payload.description;
    if (payload.address !== undefined) contactInfo.address = payload.address;
    if (payload.city !== undefined) contactInfo.city = payload.city;
    if (payload.state !== undefined) contactInfo.state = payload.state;
    if (payload.pincode !== undefined) contactInfo.pincode = payload.pincode;
    if (payload.phone !== undefined) {
      contactInfo.phone = payload.phone;
      contactInfo.cleanPhone = sanitizeCleanPhone(payload.phone);
    }
    if (payload.email !== undefined) contactInfo.email = payload.email;
    if (payload.whatsapp !== undefined) contactInfo.whatsapp = payload.whatsapp;
    if (payload.workingHours !== undefined) contactInfo.workingHours = payload.workingHours;
    if (payload.deliveryHours !== undefined) contactInfo.deliveryHours = payload.deliveryHours;
    if (payload.isActive !== undefined) contactInfo.isActive = Boolean(payload.isActive);

    if (payload.isPrimary !== undefined) {
      contactInfo.isPrimary = Boolean(payload.isPrimary);
      if (contactInfo.isPrimary) {
        await ContactInfo.updateMany({ _id: { $ne: contactInfo._id } }, { isPrimary: false });
      }
    }

    if (payload.socialLinks && typeof payload.socialLinks === 'object') {
      contactInfo.socialLinks = {
        facebook: payload.socialLinks.facebook !== undefined ? payload.socialLinks.facebook : contactInfo.socialLinks?.facebook,
        twitter: payload.socialLinks.twitter !== undefined ? payload.socialLinks.twitter : contactInfo.socialLinks?.twitter,
        linkedin: payload.socialLinks.linkedin !== undefined ? payload.socialLinks.linkedin : contactInfo.socialLinks?.linkedin,
        instagram: payload.socialLinks.instagram !== undefined ? payload.socialLinks.instagram : contactInfo.socialLinks?.instagram,
        youtube: payload.socialLinks.youtube !== undefined ? payload.socialLinks.youtube : contactInfo.socialLinks?.youtube,
      };
    }

    contactInfo.updatedBy = req.user?.name || req.user?.email || 'Admin';
    const updated = await contactInfo.save();

    broadcast('CONTACT_INFO_UPDATED', { contactInfo: updated });

    return res.json({
      success: true,
      message: 'Contact record updated successfully',
      contactInfo: updated,
    });
  } catch (err) {
    console.error('updateContactInfoById error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update record' });
  }
};

/**
 * Admin: Delete contact info record
 * DELETE /api/contact-info/:id
 */
exports.deleteContactInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ContactInfo.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (record.isPrimary) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the primary contact information. Reset it or promote another first.',
      });
    }

    await ContactInfo.findByIdAndDelete(id);
    broadcast('CONTACT_INFO_UPDATED', {});

    return res.json({ success: true, message: 'Contact info record deleted successfully' });
  } catch (err) {
    console.error('deleteContactInfo error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
};

/**
 * Admin: Reset to factory default contact information
 * POST /api/contact-info/reset
 */
exports.resetContactInfo = async (req, res) => {
  try {
    let primary = await ContactInfo.findOne({ isPrimary: true });
    if (!primary) {
      primary = new ContactInfo(DEFAULT_CONTACT_INFO);
    } else {
      Object.assign(primary, DEFAULT_CONTACT_INFO);
    }
    primary.updatedBy = req.user?.name || 'Reset to Factory Defaults';
    const reset = await primary.save();

    broadcast('CONTACT_INFO_UPDATED', { contactInfo: reset });

    return res.json({
      success: true,
      message: 'Contact details and social media links reset to factory defaults',
      contactInfo: reset,
    });
  } catch (err) {
    console.error('resetContactInfo error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset contact info' });
  }
};
