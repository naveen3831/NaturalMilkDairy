const DeliveryLocation = require('../models/DeliveryLocation');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const { recordAudit } = require('../services/auditService');
const { broadcast } = require('../config/websocket');

const DEFAULT_AREAS = [
  { name: 'Madhapur', pincode: '500081', city: 'Hyderabad', state: 'Telangana', landmark: 'Cyber Towers / Ayyappa Society', deliverySlot: 'Morning 5:00 AM - 7:00 AM' },
  { name: 'Hitec City', pincode: '500081', city: 'Hyderabad', state: 'Telangana', landmark: 'Mindspace IT Park', deliverySlot: 'Morning 5:00 AM - 7:00 AM' },
  { name: 'Gachibowli', pincode: '500032', city: 'Hyderabad', state: 'Telangana', landmark: 'Financial District & DLF', deliverySlot: 'Morning 5:30 AM - 7:30 AM' },
  { name: 'Kondapur', pincode: '500084', city: 'Hyderabad', state: 'Telangana', landmark: 'Botanical Garden Road', deliverySlot: 'Morning 5:00 AM - 7:00 AM' },
  { name: 'Jubilee Hills', pincode: '500033', city: 'Hyderabad', state: 'Telangana', landmark: 'Check Post / Road No. 36', deliverySlot: 'Morning 5:30 AM - 7:30 AM' },
  { name: 'Banjara Hills', pincode: '500034', city: 'Hyderabad', state: 'Telangana', landmark: 'Road No. 12 & City Center', deliverySlot: 'Morning 5:30 AM - 7:30 AM' },
  { name: 'Kukatpally', pincode: '500072', city: 'Hyderabad', state: 'Telangana', landmark: 'KPHB Colony / Forum Mall', deliverySlot: 'Morning 5:00 AM - 7:30 AM' },
  { name: 'Manikonda', pincode: '500089', city: 'Hyderabad', state: 'Telangana', landmark: 'Puppalguda / Lanco Hills', deliverySlot: 'Morning 5:30 AM - 7:30 AM' },
  { name: 'Financial District', pincode: '500032', city: 'Hyderabad', state: 'Telangana', landmark: 'Nanakramguda / Waverock', deliverySlot: 'Morning 5:30 AM - 7:30 AM' },
];

/**
 * Auto-seed initial delivery locations if collection is empty
 */
async function ensureSeedLocations() {
  try {
    const count = await DeliveryLocation.countDocuments();
    if (count === 0) {
      await DeliveryLocation.insertMany(DEFAULT_AREAS);
      console.log('✅ Seeded initial serviceable delivery locations into MongoDB');
    }
  } catch (err) {
    console.warn('Seed locations warning:', err.message);
  }
}

// Run initial seed on load
ensureSeedLocations();

// In-memory cache for ultra-fast location fetching
let cachedLocationsResponse = null;
let cachedLocationsTime = 0;
const LOCATIONS_CACHE_TTL = 60 * 1000; // 60 seconds

const invalidateLocationsCache = () => {
  cachedLocationsResponse = null;
  cachedLocationsTime = 0;
};

/**
 * GET /api/locations
 * Returns serviceable locations.
 * If admin: returns all with customer & partner counts using a single aggregate.
 * If user/partner/public: returns active locations only with in-memory caching.
 */
const getLocations = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';

    // Fast path: cached response for public / non-admin requests (< 1ms)
    if (!isAdmin && cachedLocationsResponse && (Date.now() - cachedLocationsTime < LOCATIONS_CACHE_TTL)) {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      return res.json(cachedLocationsResponse);
    }

    const query = isAdmin ? {} : { isActive: true };
    const locations = await DeliveryLocation.find(query).sort({ name: 1 }).lean();

    let locationsWithCounts;
    if (isAdmin) {
      // Single aggregation to fetch customer counts for all areas in 1 database roundtrip
      const customerCounts = await Customer.aggregate([
        { $match: { area: { $exists: true, $ne: '' } } },
        { $group: { _id: { $toLower: { $trim: { input: '$area' } } }, count: { $sum: 1 } } },
      ]);
      const countMap = {};
      customerCounts.forEach((c) => {
        if (c._id) countMap[c._id] = c.count;
      });

      locationsWithCounts = locations.map((loc) => ({
        ...loc,
        id: loc._id.toString(),
        customerCount: countMap[(loc.name || '').toLowerCase().trim()] || 0,
      }));
    } else {
      locationsWithCounts = locations.map((loc) => ({
        ...loc,
        id: loc._id.toString(),
        customerCount: 0,
      }));
    }

    const responsePayload = {
      success: true,
      locations: locationsWithCounts,
      areas: locationsWithCounts.filter((l) => l.isActive).map((l) => l.name),
    };

    if (!isAdmin) {
      cachedLocationsResponse = responsePayload;
      cachedLocationsTime = Date.now();
    }

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    return res.json(responsePayload);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/locations
 * Admin only: Create a new delivery location / serviceable address
 */
const createLocation = async (req, res) => {
  try {
    const {
      name,
      pincode,
      city = 'Hyderabad',
      state = 'Telangana',
      address,
      landmark,
      routeCode,
      deliverySlot,
      isActive = true,
      assignedPartnerId,
      assignedPartnerName,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Location / Area name is required.' });
    }

    const cleanName = name.trim();

    // Check duplicate (case-insensitive)
    const existing = await DeliveryLocation.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Delivery location "${cleanName}" already exists.`,
      });
    }

    // Resolve assigned partner name if ID provided
    let partnerName = assignedPartnerName || '';
    if (assignedPartnerId && !partnerName) {
      const boy = await DeliveryBoy.findById(assignedPartnerId).lean();
      if (boy) partnerName = boy.name;
    }

    const newLoc = await DeliveryLocation.create({
      name: cleanName,
      pincode: (pincode || '').trim(),
      city: (city || 'Hyderabad').trim(),
      state: (state || 'Telangana').trim(),
      address: (address || '').trim(),
      landmark: (landmark || '').trim(),
      routeCode: (routeCode || '').trim(),
      deliverySlot: (deliverySlot || 'Morning 5:00 AM - 7:30 AM').trim(),
      isActive: Boolean(isActive),
      assignedPartnerId: assignedPartnerId || '',
      assignedPartnerName: partnerName,
      notes: (notes || '').trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update partner's assignedArea if partner is linked
    if (assignedPartnerId) {
      await DeliveryBoy.findByIdAndUpdate(assignedPartnerId, {
        assignedArea: cleanName,
      });
    }

    await recordAudit(
      'Service Location Added',
      req.user?.name || 'Admin',
      `Added delivery location: ${cleanName} (PIN: ${pincode || 'N/A'})`,
      'location'
    );

    invalidateLocationsCache();
    broadcast('LOCATION_UPDATED', { id: newLoc._id.toString(), name: cleanName });

    return res.status(201).json({
      success: true,
      message: `Delivery location "${cleanName}" created successfully.`,
      location: { ...newLoc.toObject(), id: newLoc._id.toString(), customerCount: 0 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/locations/:id
 * Admin only: Update location details, status, or partner assignment
 */
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      pincode,
      city,
      state,
      address,
      landmark,
      routeCode,
      deliverySlot,
      isActive,
      assignedPartnerId,
      assignedPartnerName,
      notes,
    } = req.body;

    const loc = await DeliveryLocation.findById(id);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Delivery location not found.' });
    }

    const oldName = loc.name;

    if (name && name.trim()) {
      const cleanName = name.trim();
      if (cleanName.toLowerCase() !== loc.name.toLowerCase()) {
        const duplicate = await DeliveryLocation.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Another location named "${cleanName}" already exists.`,
          });
        }
        loc.name = cleanName;

        // Propagate name change to customers if name changed
        await Customer.updateMany(
          { area: { $regex: new RegExp(`^${oldName}$`, 'i') } },
          { $set: { area: cleanName } }
        );
      }
    }

    if (pincode !== undefined) loc.pincode = (pincode || '').trim();
    if (city !== undefined) loc.city = (city || 'Hyderabad').trim();
    if (state !== undefined) loc.state = (state || 'Telangana').trim();
    if (address !== undefined) loc.address = (address || '').trim();
    if (landmark !== undefined) loc.landmark = (landmark || '').trim();
    if (routeCode !== undefined) loc.routeCode = (routeCode || '').trim();
    if (deliverySlot !== undefined) loc.deliverySlot = (deliverySlot || '').trim();
    if (typeof isActive === 'boolean') loc.isActive = isActive;
    if (notes !== undefined) loc.notes = (notes || '').trim();

    if (assignedPartnerId !== undefined) {
      loc.assignedPartnerId = assignedPartnerId || '';
      let partnerName = assignedPartnerName || '';
      if (assignedPartnerId && !partnerName) {
        const boy = await DeliveryBoy.findById(assignedPartnerId).lean();
        if (boy) partnerName = boy.name;
      }
      loc.assignedPartnerName = partnerName;

      if (assignedPartnerId) {
        await DeliveryBoy.findByIdAndUpdate(assignedPartnerId, {
          assignedArea: loc.name,
        });
      }
    }

    loc.updatedAt = new Date();
    await loc.save();

    await recordAudit(
      'Service Location Updated',
      req.user?.name || 'Admin',
      `Updated location: ${loc.name} (Active: ${loc.isActive})`,
      'location'
    );

    invalidateLocationsCache();
    broadcast('LOCATION_UPDATED', { id: loc._id.toString(), name: loc.name });

    const customerCount = await Customer.countDocuments({
      area: { $regex: new RegExp(`^${loc.name}$`, 'i') },
    });

    return res.json({
      success: true,
      message: `Delivery location "${loc.name}" updated successfully.`,
      location: { ...loc.toObject(), id: loc._id.toString(), customerCount },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/locations/:id
 * Admin only: Remove or deactivate location
 */
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const loc = await DeliveryLocation.findById(id);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Delivery location not found.' });
    }

    const activeCustomers = await Customer.countDocuments({
      area: { $regex: new RegExp(`^${loc.name}$`, 'i') },
      status: 'active',
    });

    if (activeCustomers > 0) {
      // Soft-deactivate if active customers exist to avoid breaking delivery route history
      loc.isActive = false;
      loc.updatedAt = new Date();
      await loc.save();

      await recordAudit(
        'Service Location Deactivated',
        req.user?.name || 'Admin',
        `Deactivated location ${loc.name} (${activeCustomers} active customers still assigned)`,
        'location'
      );

      invalidateLocationsCache();
    broadcast('LOCATION_UPDATED', { id: loc._id.toString(), name: loc.name });

      return res.json({
        success: true,
        message: `Location "${loc.name}" has ${activeCustomers} active customers. It has been marked Inactive instead of permanently deleted.`,
        location: { ...loc.toObject(), id: loc._id.toString(), customerCount: activeCustomers },
      });
    }

    await DeliveryLocation.deleteOne({ _id: id });

    await recordAudit(
      'Service Location Deleted',
      req.user?.name || 'Admin',
      `Permanently deleted location: ${loc.name}`,
      'location'
    );

    invalidateLocationsCache();
    broadcast('LOCATION_UPDATED', { id, deleted: true });

    return res.json({
      success: true,
      message: `Location "${loc.name}" was successfully removed.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  ensureSeedLocations,
};
