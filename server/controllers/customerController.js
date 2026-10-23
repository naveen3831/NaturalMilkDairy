const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const DeliveryBoy = require('../models/DeliveryBoy');
const DeliveryLocation = require('../models/DeliveryLocation');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const { recordAudit } = require('../services/auditService');
const { ensureDeliveriesForDate, formatDate } = require('../services/deliveryService');
const { broadcast } = require('../config/websocket');
const { hashPassword, generateTemporaryPassword } = require('../security/password');

// Get all customers with search and filters
const getCustomers = async (req, res) => {
  try {
    const { search, status, area, deliveryBoyId } = req.query;

    // Ensure all registered users (role: customer or user) have a Customer document
    try {
      const customerUsers = await User.find({ role: { $in: ['customer', 'user'] } }).lean();
      for (const u of customerUsers) {
        const hasCustomer = await Customer.findOne({ mobile: u.mobile });
        if (!hasCustomer) {
          const custCount = await Customer.countDocuments();
          await Customer.create({
            customerId: `CUST-${custCount + 101}`,
            name: u.name,
            mobile: u.mobile,
            email: u.email || '',
            address: u.address || `${u.assignedArea || 'Madhapur'}, Home Delivery`,
            area: u.assignedArea || 'Madhapur',
            status: 'inactive',
            subscription: { status: 'pending_payment' },
            deliveryPlan: {
              milkQty: 0,
              milkUnit: 'L',
              curdQty: 0,
              curdUnit: 'g',
              frequency: 'daily',
              deliveryDays: [],
              deliveryBoyId: '',
              deliveryBoyName: '',
              startDate: u.createdAt || new Date(),
            },
            paymentInfo: { paymentType: 'prepaid', paymentCycle: 'monthly' },
            currentBalance: 0,
            notes: 'Created from registered user account',
            createdAt: u.createdAt || new Date(),
          });
        }
      }
    } catch (syncErr) {
      console.warn('Sync registered users note:', syncErr.message);
    }

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (area && area !== 'all') {
      filter.area = area;
    }
    if (deliveryBoyId && deliveryBoyId !== 'all') {
      filter['deliveryPlan.deliveryBoyId'] = deliveryBoyId;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { customerId: { $regex: q, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: customers.length,
      customers: customers.map((customer) => {
        const safeCustomer = { ...customer };
        delete safeCustomer.password;
        return { ...safeCustomer, id: safeCustomer._id.toString() };
      }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get single customer
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const customer = await Customer.findOne(query).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const safeCustomer = { ...customer };
    delete safeCustomer.password;
    return res.json({
      success: true,
      customer: {
        ...safeCustomer,
        id: safeCustomer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Customer details must be an object.' });
    }
    const {
      name,
      email,
      password,
      mobile,
      whatsapp,
      address,
      area,
      landmark,
      milkQty,
      milkUnit,
      curdQty,
      curdUnit,
      frequency,
      deliveryDays,
      deliveryBoyId,
      paymentType,
      paymentCycle,
      initialBalance,
      notes,
      actor,
    } = req.body;

    if (
      typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80 ||
      typeof mobile !== 'string' || !/^(?:\+?91[- ]?)?[6-9]\d{9}$/.test(mobile.trim()) ||
      typeof address !== 'string' || address.trim().length < 4 || address.trim().length > 250
    ) {
      return res.status(400).json({ success: false, message: 'Name, mobile and address are required' });
    }

    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    if (email !== undefined && (typeof email !== 'string' || email.length > 254)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (whatsapp !== undefined && (typeof whatsapp !== 'string' || whatsapp.length > 20)) {
      return res.status(400).json({ success: false, message: 'WhatsApp number must be 20 characters or fewer.' });
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (password !== undefined && password !== '' &&
      (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
    }
    if (!password && !cleanEmail) {
      return res.status(400).json({ success: false, message: 'Provide a password or an email address for secure credential delivery.' });
    }
    const customerPassword = password || generateTemporaryPassword();
    const passwordHash = await hashPassword(customerPassword);
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // Duplicate check for mobile
    const existingByMobile = await Customer.findOne({ mobile: cleanMobile });
    if (existingByMobile) {
      return res.status(400).json({
        success: false,
        message: `Phone number (${cleanMobile}) is already registered with customer "${existingByMobile.name}". Please change the phone number.`,
        field: 'mobile',
      });
    }

    // Duplicate check for email if provided
    if (cleanEmail) {
      const existingByEmail = await Customer.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') },
      });
      if (existingByEmail) {
        return res.status(400).json({
          success: false,
          message: `Email address (${cleanEmail}) is already registered with customer "${existingByEmail.name}". Please change the email address.`,
          field: 'email',
        });
      }
    }

    // Find driver name if assigned or if created by driver
    const isDriver = req.user?.role === 'delivery_boy';
    let boyName = isDriver ? (req.user.name || 'Delivery Partner') : '';
    let finalDeliveryBoyId = isDriver
      ? (req.user.boyId || req.user.id || '')
      : (deliveryBoyId || '');

    // Validate that the requested delivery area is an active serviceable location
    const targetArea = (area || (isDriver ? (req.user?.assignedArea || 'Madhapur') : 'Madhapur')).trim();
    const validLocation = await DeliveryLocation.findOne({
      name: { $regex: new RegExp(`^${targetArea}$`, 'i') },
      isActive: true,
    });

    if (!validLocation) {
      return res.status(400).json({
        success: false,
        message: `Delivery location "${targetArea}" is not currently in our serviceable zones. Please select an active location configured by admin.`,
      });
    }

    // If created by a delivery driver, ensure they only create accounts in their assigned territory
    if (isDriver) {
      const driverRecord = await DeliveryBoy.findOne({
        $or: [
          ...(req.user.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),
          ...(req.user.mobile ? [{ mobile: req.user.mobile }] : []),
        ],
      }).lean();
      const driverAssignedArea = (driverRecord?.assignedArea || req.user.assignedArea || '').trim();
      if (
        driverAssignedArea &&
        driverAssignedArea.toLowerCase() !== 'all dairy routes' &&
        driverAssignedArea.toLowerCase() !== validLocation.name.toLowerCase()
      ) {
        return res.status(403).json({
          success: false,
          message: `As a delivery partner assigned to "${driverAssignedArea}", you can only create accounts within your assigned location.`,
        });
      }
    }

    if (isDriver && !finalDeliveryBoyId) {
      finalDeliveryBoyId = req.user.id || req.user.boyId || '';
      boyName = req.user.name || 'Delivery Partner';
    } else if (finalDeliveryBoyId) {
      const boy = await DeliveryBoy.findOne(
        finalDeliveryBoyId.length === 24 ? { _id: finalDeliveryBoyId } : { mobile: finalDeliveryBoyId }
      ).lean();
      if (boy) boyName = boy.name;
    }

    const customerCount = await Customer.countDocuments();
    const customerId = `CUST-${customerCount + 101}`;

    const newCustomer = await Customer.create({
      customerId,
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      password: passwordHash,
      whatsapp: (whatsapp || cleanMobile).trim(),
      address: address.trim(),
      area: area || (isDriver ? (req.user?.assignedArea || 'Madhapur') : 'Madhapur'),
      landmark: landmark || '',
      latitude: 19.12 + Math.random() * 0.04,
      longitude: 72.82 + Math.random() * 0.04,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: Number(milkQty) || 1,
        milkUnit: milkUnit || 'L',
        curdQty: Number(curdQty) || 0,
        curdUnit: curdUnit || 'g',
        frequency: frequency || 'daily',
        deliveryDays: deliveryDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: finalDeliveryBoyId,
        deliveryBoyName: boyName,
        startDate: new Date(),
      },
      paymentInfo: {
        paymentType: paymentType || 'credit',
        paymentCycle: paymentCycle || 'monthly',
      },
      currentBalance: Number(initialBalance) || 0,
      createdBy: isDriver ? 'driver' : (req.body.createdBy || 'admin'),
      createdByDriverId: isDriver ? (req.user.id || req.user.boyId || '') : (req.body.createdByDriverId || ''),
      createdByDriverName: isDriver ? (req.user.name || '') : (req.body.createdByDriverName || ''),
      notes: notes || '',
      createdAt: new Date(),
    });

    // Create user login record for portal
    await User.findOneAndUpdate(
      { mobile: cleanMobile },
      {
        $set: {
          name: cleanName,
          email: cleanEmail,
          mobile: cleanMobile,
          password: passwordHash,
          role: 'customer',
          status: 'active',
        },
      },
      { upsert: true }
    );

    await recordAudit(
      'New Customer Added',
      actor || 'Admin',
      `Added ${cleanName} (${customerId}) with ${newCustomer.deliveryPlan.milkQty}L Milk daily`,
      'customer'
    );

    let emailSent = false;
    if (cleanEmail) {
      const { sendCustomerCredentialsEmail } = require('../services/emailService');
      try {
        const emailRes = await sendCustomerCredentialsEmail(newCustomer, customerPassword);
        emailSent = emailRes?.success || false;
      } catch (e) {
        console.error('Customer credentials email note:', e.message);
      }
    }

    // Instant notification for delivery partner
    if (finalDeliveryBoyId || isDriver) {
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: finalDeliveryBoyId || '',
          title: '📦 New Customer Assigned',
          message: `${isDriver ? 'You' : 'Admin'} enrolled customer ${cleanName} (${newCustomer.deliveryPlan.milkQty}L Milk daily) in ${newCustomer.area || 'Madhapur'}.`,
          type: 'delivery_assigned',
          data: {
            customerId: newCustomer.customerId,
            customerName: cleanName,
            customerAddress: newCustomer.address,
            customerPhone: cleanMobile,
            deliveryBoyId: finalDeliveryBoyId,
            deliveryBoyName: boyName,
            milkQty: newCustomer.deliveryPlan.milkQty,
          },
        });
      } catch (notifErr) {
        console.warn('Driver customer creation notification error:', notifErr.message);
      }
    }

    await ensureDeliveriesForDate(formatDate());
    broadcast('CUSTOMER_UPDATED', { customerId: newCustomer.customerId });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    const customerResponse = newCustomer.toObject();
    delete customerResponse.password;
    return res.status(201).json({
      success: true,
      customer: {
        ...customerResponse,
        id: newCustomer._id.toString(),
      },
      emailSent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Customer details must be an object.' });
    }
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const fieldLimits = {
      name: 80,
      email: 254,
      mobile: 15,
      whatsapp: 20,
      address: 250,
      area: 100,
      landmark: 120,
      notes: 1000,
      deliveryBoyId: 64,
      deliveryBoyName: 80,
    };
    for (const [field, maxLength] of Object.entries(fieldLimits)) {
      if (req.body[field] !== undefined &&
        (typeof req.body[field] !== 'string' || req.body[field].length > maxLength)) {
        return res.status(400).json({ success: false, message: `${field} must be a string of at most ${maxLength} characters.` });
      }
    }

    const existingCust = await Customer.findOne(query);
    if (!existingCust) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const isDriver = req.user?.role === 'delivery_boy';

    if (req.body.mobile && req.body.mobile.trim() !== existingCust.mobile) {
      const cleanMobile = req.body.mobile.trim();
      const dup = await Customer.findOne({ mobile: cleanMobile, _id: { $ne: existingCust._id } });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Phone number (${cleanMobile}) is already registered with customer "${dup.name}". Please change the phone number.`,
          field: 'mobile',
        });
      }
    }

    if (req.body.email && req.body.email.trim().toLowerCase() !== (existingCust.email || '').toLowerCase()) {
      const cleanEmail = req.body.email.trim().toLowerCase();
      const dup = await Customer.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') },
        _id: { $ne: existingCust._id },
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Email address (${cleanEmail}) is already registered with customer "${dup.name}". Please change the email address.`,
          field: 'email',
        });
      }
    }

    let boyName = req.body.deliveryBoyName;
    if (req.body.deliveryBoyId && !boyName) {
      const boy = await DeliveryBoy.findOne(
        req.body.deliveryBoyId.length === 24 ? { _id: req.body.deliveryBoyId } : { mobile: req.body.deliveryBoyId }
      ).lean();
      if (boy) boyName = boy.name;
    }

    if (req.body.area) {
      const validLoc = await DeliveryLocation.findOne({
        name: { $regex: new RegExp(`^${req.body.area.trim()}$`, 'i') },
        isActive: true,
      });
      if (!validLoc) {
        return res.status(400).json({
          success: false,
          message: `Delivery location "${req.body.area}" is not currently an active serviceable location.`,
        });
      }
      req.body.area = validLoc.name;
    }

    const adminFields = [
      'name', 'email', 'mobile', 'whatsapp', 'address', 'area', 'landmark',
      'status', 'currentBalance', 'notes', 'password',
      'milkQty', 'milkUnit', 'curdQty', 'curdUnit', 'frequency', 'deliveryDays',
      'deliveryBoyId', 'deliveryBoyName', 'paymentType', 'paymentCycle',
      'deliveryPlan.milkQty', 'deliveryPlan.milkUnit', 'deliveryPlan.curdQty',
      'deliveryPlan.curdUnit', 'deliveryPlan.frequency', 'deliveryPlan.deliveryDays',
      'deliveryPlan.deliveryBoyId', 'deliveryPlan.deliveryBoyName',
      'paymentInfo.paymentType', 'paymentInfo.paymentCycle',
    ];
    const driverFields = [
      'whatsapp', 'address', 'landmark', 'notes',
      'milkQty', 'milkUnit', 'curdQty', 'curdUnit', 'frequency', 'deliveryDays',
      'deliveryPlan.milkQty', 'deliveryPlan.milkUnit',
      'deliveryPlan.curdQty', 'deliveryPlan.curdUnit', 'deliveryPlan.frequency',
      'deliveryPlan.deliveryDays',
    ];
    const updateData = {};
    for (const field of (isDriver ? driverFields : adminFields)) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    }
    if (updateData.name !== undefined &&
      (typeof updateData.name !== 'string' || updateData.name.trim().length < 2 || updateData.name.trim().length > 80)) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters.' });
    }
    if (updateData.mobile !== undefined &&
      (typeof updateData.mobile !== 'string' || !/^(?:\+?91[- ]?)?[6-9]\d{9}$/.test(updateData.mobile.trim()))) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    }
    if (updateData.address !== undefined &&
      (typeof updateData.address !== 'string' || updateData.address.trim().length < 4 || updateData.address.trim().length > 250)) {
      return res.status(400).json({ success: false, message: 'Address must be between 4 and 250 characters.' });
    }
    const quantities = ['milkQty', 'curdQty', 'deliveryPlan.milkQty', 'deliveryPlan.curdQty'];
    for (const key of quantities) {
      if (updateData[key] !== undefined &&
        (!Number.isFinite(Number(updateData[key])) || Number(updateData[key]) < 0 || Number(updateData[key]) > 20_000)) {
        return res.status(400).json({ success: false, message: 'Delivery quantities must be valid non-negative numbers.' });
      }
    }
    const frequency = updateData.frequency || updateData['deliveryPlan.frequency'];
    if (frequency !== undefined && !['daily', 'alternate', 'selected', 'custom'].includes(frequency)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery frequency.' });
    }
    const deliveryDays = updateData.deliveryDays || updateData['deliveryPlan.deliveryDays'];
    if (deliveryDays !== undefined &&
      (!Array.isArray(deliveryDays) || deliveryDays.length > 7 ||
        deliveryDays.some((day) => !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(day)))) {
      return res.status(400).json({ success: false, message: 'Select valid delivery days.' });
    }
    if (req.body.password !== undefined && !isDriver) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8 || req.body.password.length > 128) {
        return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
      }
      updateData.password = await hashPassword(req.body.password);
    }
    if (updateData.milkQty !== undefined) {
      updateData['deliveryPlan.milkQty'] = Number(updateData.milkQty);
    }
    if (updateData.milkUnit !== undefined) {
      updateData['deliveryPlan.milkUnit'] = updateData.milkUnit;
    }
    if (updateData.curdQty !== undefined) {
      updateData['deliveryPlan.curdQty'] = Number(updateData.curdQty);
    }
    if (updateData.curdUnit !== undefined) {
      updateData['deliveryPlan.curdUnit'] = updateData.curdUnit;
    }
    if (updateData.frequency !== undefined) {
      updateData['deliveryPlan.frequency'] = updateData.frequency;
    }
    if (updateData.deliveryBoyId !== undefined) {
      updateData['deliveryPlan.deliveryBoyId'] = updateData.deliveryBoyId;
    }
    if (boyName && updateData.deliveryBoyId !== undefined) {
      updateData['deliveryPlan.deliveryBoyName'] = boyName;
    }
    if (updateData.paymentType !== undefined) {
      updateData['paymentInfo.paymentType'] = updateData.paymentType;
    }
    if (updateData.paymentCycle !== undefined) {
      updateData['paymentInfo.paymentCycle'] = updateData.paymentCycle;
    }
    if (isDriver) {
      updateData.area = existingCust.area;
      updateData['deliveryPlan.deliveryBoyId'] = req.user.boyId || req.user.id;
      updateData['deliveryPlan.deliveryBoyName'] = req.user.name;
    }

    const updated = await Customer.findOneAndUpdate(query, { $set: updateData }, { new: true });

    // Sync auth User record
    const userUpdate = {};
    if (updateData.name) userUpdate.name = updateData.name.trim();
    if (updateData.email) userUpdate.email = updateData.email.trim().toLowerCase();
    if (updateData.mobile) userUpdate.mobile = updateData.mobile.trim();
    if (req.body.password && !isDriver) userUpdate.password = updateData.password;
    if (Object.keys(userUpdate).length > 0) {
      await User.findOneAndUpdate(
        { $or: [{ mobile: existingCust.mobile }, { mobile: updated.mobile }] },
        { $set: userUpdate }
      );
    }

    await recordAudit(
      'Customer Updated',
      req.user.name || req.user.role,
      `Updated details for ${updated.name} (${updated.customerId})`,
      'customer'
    );

    broadcast('CUSTOMER_UPDATED', { id });
    broadcast('DELIVERY_UPDATED', {});

    return res.json({
      success: true,
      customer: {
        ...updated.toObject(),
        id: updated._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Pause delivery
const pauseDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { pauseFrom, pauseUntil, reason, actor } = req.body;
    const query = id.length === 24 ? { _id: id } : { customerId: id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.status = 'paused';
    customer.pauseFrom = pauseFrom;
    customer.pauseUntil = pauseUntil;
    if (customer.subscription) {
      customer.subscription.status = 'paused';
    }
    if (reason) customer.notes = `${customer.notes ? customer.notes + ' | ' : ''}Pause: ${reason}`;
    await customer.save();

    // Also update any matching Subscription documents to paused
    await Subscription.updateMany(
      { $or: [{ customer: customer._id }, { customerId: customer.customerId }], status: 'active' },
      { $set: { status: 'paused', updatedAt: new Date() } }
    );

    // Sync pending deliveries immediately so driver route list doesn't show paused drops
    await Delivery.updateMany(
      {
        $or: [
          { customerId: customer._id.toString() },
          { customerId: customer.customerId },
          { customerPhone: customer.mobile },
        ],
        status: 'pending',
      },
      {
        $set: {
          status: 'not_delivered',
          notDeliveredReason: `Delivery Paused: ${reason || 'Customer Vacation'}`,
        },
      }
    );

    await recordAudit(
      'Customer Delivery Paused',
      actor || 'Admin',
      `Paused ${customer.name} from ${pauseFrom} to ${pauseUntil}${reason ? ` (${reason})` : ''}`,
      'customer'
    );

    // Notify delivery partner
    if (customer.deliveryPlan?.deliveryBoyId) {
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: customer.deliveryPlan.deliveryBoyId,
          title: '⏸️ Customer Delivery Paused',
          message: `${customer.name} paused deliveries ${pauseFrom ? `from ${pauseFrom}` : ''} ${pauseUntil ? `to ${pauseUntil}` : ''}.${reason ? ' Reason: ' + reason : ''}`,
          type: 'route_update',
          data: {
            customerId: customer.customerId,
            customerName: customer.name,
            pauseFrom,
            pauseUntil,
          },
        });
      } catch (e) {}
    }

    broadcast('CUSTOMER_UPDATED', { id });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Resume delivery
const resumeDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor } = req.body;
    const query = id.length === 24 ? { _id: id } : { customerId: id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.status = 'active';
    customer.pauseFrom = null;
    customer.pauseUntil = null;
    if (customer.subscription) {
      customer.subscription.status = 'active';
    }
    await customer.save();

    // Also update any matching Subscription documents to active
    await Subscription.updateMany(
      { $or: [{ customer: customer._id }, { customerId: customer.customerId }], status: 'paused' },
      { $set: { status: 'active', updatedAt: new Date() } }
    );

    const today = formatDate();
    // Reactivate paused deliveries for today/future
    await Delivery.updateMany(
      {
        $or: [
          { customerId: customer._id.toString() },
          { customerId: customer.customerId },
          { customerPhone: customer.mobile },
        ],
        deliveryDate: { $gte: today },
        status: 'not_delivered',
        notDeliveredReason: { $regex: /Paused|Vacation/i },
      },
      {
        $set: {
          status: 'pending',
          notDeliveredReason: '',
        },
      }
    );
    await ensureDeliveriesForDate(today);

    // Notify delivery partner
    if (customer.deliveryPlan?.deliveryBoyId) {
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: customer.deliveryPlan.deliveryBoyId,
          title: '▶️ Customer Delivery Resumed',
          message: `${customer.name} has resumed daily milk deliveries on your route.`,
          type: 'route_update',
          data: {
            customerId: customer.customerId,
            customerName: customer.name,
          },
        });
      } catch (e) {}
    }

    await recordAudit('Customer Delivery Resumed', actor || 'Admin', `Resumed active delivery for ${customer.name}`, 'customer');

    broadcast('CUSTOMER_UPDATED', { id });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Temporary quantity change
const setTemporaryQty = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, milkQty, curdQty, actor } = req.body;
    const query = id.length === 24 ? { _id: id } : { customerId: id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.temporaryQty = {
      date,
      milkQty: Number(milkQty),
      curdQty: Number(curdQty),
    };
    await customer.save();

    // Update existing pending delivery for this date so driver sees the new quantity instantly
    await Delivery.updateMany(
      {
        $or: [
          { customerId: customer._id.toString() },
          { customerId: customer.customerId },
          { customerPhone: customer.mobile },
        ],
        deliveryDate: date,
        status: 'pending',
      },
      {
        $set: {
          plannedMilk: Number(milkQty),
          actualMilk: Number(milkQty),
          plannedCurd: Number(curdQty),
          actualCurd: Number(curdQty),
          totalAmount: Number(milkQty) * 60 + (Number(curdQty) / 500) * 30,
        },
      }
    );

    await recordAudit(
      'Temporary Quantity Changed',
      actor || 'Admin',
      `Temporary quantity for ${customer.name} on ${date}: ${milkQty}L Milk, ${curdQty}g Curd`,
      'customer'
    );

    broadcast('CUSTOMER_UPDATED', { id });
    broadcast('DELIVERY_UPDATED', {});

    return res.json({
      success: true,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Complete Customer Ledger
const getCustomerLedger = async (req, res) => {
  try {
    const customerId = req.params.id;
    const query = customerId.length === 24 ? { _id: customerId } : { customerId };
    const customer = await Customer.findOne(query).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const custIds = [customer._id.toString(), customer.customerId];

    // Deliveries and payments for this customer (respecting user-deleted history entries)
    const [customerDeliveries, customerPayments] = await Promise.all([
      Delivery.find({ customerId: { $in: custIds }, deletedForCustomer: { $ne: true } }).lean(),
      Payment.find({ customerId: { $in: custIds }, deletedForCustomer: { $ne: true } }).lean(),
    ]);

    const ledgerEntries = [];

    customerDeliveries.forEach((del) => {
      ledgerEntries.push({
        id: del._id.toString(),
        type: 'delivery',
        date: del.deliveryDate,
        time: del.deliveredAt,
        milk: `${del.actualMilk || del.plannedMilk} L`,
        curd: del.actualCurd || del.plannedCurd ? `${del.actualCurd || del.plannedCurd} g` : '0',
        rateDetails: `Milk @₹${del.milkPrice || 60}/L${del.actualCurd ? `, Curd @₹${del.curdPrice || 30}` : ''}`,
        amount: del.status === 'not_delivered' ? 0 : del.totalAmount,
        status: del.status,
        paymentMethod: del.paymentMethod,
        paymentStatus: del.paymentStatus,
        notes: del.notes || (del.status === 'not_delivered' ? del.notDeliveredReason : ''),
        deliveryBoyName: del.deliveryBoyName,
        proofImage: del.proofImage || '',
        rawItem: del,
      });
    });

    const ledgerPayments = customerPayments.filter((pay) => pay.purpose !== 'subscription');
    ledgerPayments.forEach((pay) => {
      ledgerEntries.push({
        id: pay._id.toString(),
        type: 'payment',
        date: typeof pay.paymentDate === 'string' ? pay.paymentDate.split('T')[0] : new Date(pay.paymentDate).toISOString().split('T')[0],
        time: pay.paymentDate,
        milk: '-',
        curd: '-',
        rateDetails: `Ref: ${pay.referenceNumber || 'N/A'}`,
        amount: -Math.abs(pay.amount),
        paidAmount: pay.amount,
        status: 'Paid',
        paymentMethod: pay.paymentMethod?.toUpperCase(),
        paymentStatus: 'Recorded',
        notes: pay.notes || `Collected by ${pay.collectedBy}`,
        deliveryBoyName: pay.collectedBy,
        rawItem: pay,
      });
    });

    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    ledgerEntries.forEach((entry) => {
      if (entry.type === 'delivery') {
        if (entry.status === 'delivered') {
          if (entry.paymentMethod === 'credit') {
            runningBalance += entry.amount;
          }
        }
      } else if (entry.type === 'payment') {
        runningBalance -= entry.paidAmount;
      }
      entry.balance = runningBalance;
    });

    const deliveredList = customerDeliveries.filter((d) => d.status === 'delivered');
    const totalMilkDelivered = deliveredList.reduce((sum, d) => sum + (d.actualMilk || 0), 0);
    const totalCurdDelivered = deliveredList.reduce((sum, d) => sum + (d.actualCurd || 0), 0) / 1000;
    const grossBill = deliveredList.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const totalPaid = ledgerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const waPhone = customer.whatsapp || customer.mobile;
    const reminderMessage = encodeURIComponent(
      `Hello ${customer.name},\nGreetings from *Natural Milk Dairy*!\nYour milk & curd delivery account has an outstanding balance of *₹${customer.currentBalance}*.\nKindly make the payment via UPI/Cash. Thank you for choosing fresh & pure dairy!`
    );
    const whatsappUrl = `https://wa.me/91${waPhone.replace(/\D/g, '')}?text=${reminderMessage}`;

    return res.json({
      success: true,
      customer: {
        ...customer,
        id: customer._id.toString(),
      },
      outstanding: customer.currentBalance,
      totalMilkDelivered: `${totalMilkDelivered.toFixed(1)} L`,
      totalCurdDelivered: `${totalCurdDelivered.toFixed(2)} Kg`,
      grossBill,
      totalPaid,
      ledgerEntries,
      whatsappUrl,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const sendCustomerCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!customer.email) {
      return res.status(400).json({ success: false, message: 'No email address registered for this customer' });
    }

    const user = await User.findOne({ mobile: customer.mobile });
    const password = generateTemporaryPassword();
    const passwordHash = await hashPassword(password);
    customer.password = passwordHash;
    await customer.save();
    if (user) {
      user.password = passwordHash;
      await user.save();
    }

    const { sendCustomerCredentialsEmail } = require('../services/emailService');
    const emailRes = await sendCustomerCredentialsEmail(customer, password);

    if (!emailRes?.success) {
      return res.status(500).json({
        success: false,
        message: emailRes?.error || 'Failed to dispatch email via SMTP',
      });
    }

    await recordAudit(
      'Credentials Dispatched',
      req.body?.actor || 'Admin',
      `Emailed customer login credentials for ${customer.name} to ${customer.email}`,
      'customer'
    );

    return res.json({
      success: true,
      message: `Credentials successfully emailed to ${customer.email}`,
      messageId: emailRes.messageId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateOwnCustomerProfile = async (req, res) => {
  try {
    let customer = null;
    if (req.user.id && req.user.id.length === 24) {
      try {
        customer = await Customer.findById(req.user.id);
      } catch (e) {
        customer = null;
      }
    }
    if (!customer && req.user.mobile) {
      customer = await Customer.findOne({ mobile: req.user.mobile });
    }
    if (!customer && req.user.email) {
      customer = await Customer.findOne({ email: req.user.email });
    }
    if (!customer && req.user.customerId) {
      customer = await Customer.findOne({ customerId: req.user.customerId });
    }
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    const fields = ['name', 'mobile', 'email', 'whatsapp', 'address', 'area', 'landmark'];
    const profile = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
        }
        profile[field] = req.body[field].trim();
      }
    }

    if (!profile.name || !profile.mobile || !profile.address) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile number, and delivery address are required.',
      });
    }

    if (profile.email) profile.email = profile.email.toLowerCase();
    if (profile.mobile !== customer.mobile) {
      const [duplicateCustomer, duplicateUser] = await Promise.all([
        Customer.findOne({ mobile: profile.mobile, _id: { $ne: customer._id } }).lean(),
        User.findOne({ mobile: profile.mobile, _id: { $ne: req.user.id } }).lean(),
      ]);
      if (duplicateCustomer || duplicateUser) {
        return res.status(409).json({ success: false, message: 'That mobile number is already in use.' });
      }
    }

    if (profile.email) {
      const duplicateEmail = await Customer.findOne({
        email: { $regex: new RegExp(`^${profile.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: customer._id },
      }).lean();
      if (duplicateEmail) {
        return res.status(409).json({ success: false, message: 'That email address is already in use.' });
      }
    }

    const oldMobile = customer.mobile;
    if (req.body.deliveryPlan && typeof req.body.deliveryPlan === 'object') {
      const dp = req.body.deliveryPlan;
      customer.deliveryPlan = {
        ...(customer.deliveryPlan || {}),
        ...dp,
        milkQty: dp.milkQty !== undefined ? Number(dp.milkQty) : customer.deliveryPlan?.milkQty ?? 1,
        curdQty: dp.curdQty !== undefined ? Number(dp.curdQty) : customer.deliveryPlan?.curdQty ?? 0,
        frequency: dp.frequency || customer.deliveryPlan?.frequency || 'daily',
      };
    }

    // If area is provided or changed, link customer to the active serviceable location's assigned delivery partner
    if (profile.area) {
      try {
        const matchedLoc = await DeliveryLocation.findOne({
          name: { $regex: new RegExp(`^${profile.area.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        }).lean();
        if (matchedLoc && matchedLoc.assignedPartnerId) {
          customer.deliveryPlan = {
            ...(customer.deliveryPlan || {}),
            deliveryBoyId: matchedLoc.assignedPartnerId,
            deliveryBoyName: matchedLoc.assignedPartnerName || '',
          };
        }
      } catch (locErr) {
        console.warn('Location lookup warning on profile update:', locErr.message);
      }
    }

    Object.assign(customer, profile);
    await customer.save();

    await User.updateMany(
      { mobile: oldMobile, role: { $in: ['customer', 'user'] } },
      {
        $set: {
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email || '',
          address: customer.address,
          assignedArea: customer.area || '',
        },
      }
    );

    // Sync all pending deliveries in real time for driver and admin
    const fullAddress = [customer.address, customer.landmark, customer.area].filter(Boolean).join(', ');
    const deliveryUpdate = {
      customerName: customer.name,
      customerPhone: customer.mobile,
      customerAddress: fullAddress,
    };
    if (customer.deliveryPlan?.deliveryBoyId) {
      deliveryUpdate.deliveryBoyId = customer.deliveryPlan.deliveryBoyId;
      deliveryUpdate.deliveryBoyName = customer.deliveryPlan.deliveryBoyName || '';
    }
    if (customer.deliveryPlan?.milkQty !== undefined) {
      deliveryUpdate.plannedMilk = customer.deliveryPlan.milkQty;
      deliveryUpdate.actualMilk = customer.deliveryPlan.milkQty;
    }
    if (customer.deliveryPlan?.curdQty !== undefined) {
      deliveryUpdate.plannedCurd = customer.deliveryPlan.curdQty;
      deliveryUpdate.actualCurd = customer.deliveryPlan.curdQty;
    }
    if (deliveryUpdate.plannedMilk !== undefined) {
      const milkPrice = 60;
      const curdPrice = 30;
      deliveryUpdate.totalAmount = (deliveryUpdate.plannedMilk * milkPrice) + ((deliveryUpdate.plannedCurd / 500) * curdPrice);
    }

    await Delivery.updateMany(
      {
        $or: [
          { customerId: customer._id.toString() },
          { customerId: customer.customerId },
          { customerPhone: oldMobile },
          { customerPhone: customer.mobile },
        ],
        status: 'pending',
      },
      { $set: deliveryUpdate }
    );

    // Broadcast real-time events over WebSocket so admin & delivery partner dashboards update immediately!
    broadcast('CUSTOMER_UPDATED', { customerId: customer.customerId, id: customer._id.toString() });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      customer: { ...customer.toObject(), id: customer._id.toString() },
    });
  } catch (err) {
    console.error('Customer profile update failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to update your profile right now.' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor, customerId: bodyCustomerId } = req.body || {};

    let customer = null;
    const targetId = (id === 'me' || !id) ? (req.user?.id || bodyCustomerId) : (id || bodyCustomerId);

    if (targetId && targetId.length === 24) {
      try {
        customer = await Customer.findById(targetId);
      } catch (e) {
        customer = null;
      }
    }
    if (!customer && targetId) {
      customer = await Customer.findOne({
        $or: [{ customerId: targetId }, { mobile: targetId }, { email: targetId }],
      });
    }
    if (!customer && req.user) {
      if (req.user.id && req.user.id.length === 24) {
        try {
          customer = await Customer.findById(req.user.id);
        } catch (e) {
          customer = null;
        }
      }
      if (!customer && req.user.mobile) {
        customer = await Customer.findOne({ mobile: req.user.mobile });
      }
      if (!customer && req.user.email) {
        customer = await Customer.findOne({ email: req.user.email });
      }
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found in database.',
      });
    }

    const customerIds = [customer._id.toString(), customer.customerId].filter(Boolean);

    // 1. Permanently remove all deliveries
    await Delivery.deleteMany({ customerId: { $in: customerIds } });

    // 2. Permanently remove payments/ledger
    await Payment.deleteMany({ customerId: { $in: customerIds } });

    // 3. Permanently remove notifications
    await Notification.deleteMany({
      $or: [
        { recipientRole: 'customer', recipientId: { $in: [customer._id.toString(), ...customerIds] } },
        ...(req.user?.id ? [{ recipientId: req.user.id }] : []),
      ],
    });

    // 4. Permanently remove user login credentials
    await User.deleteMany({
      $or: [
        { mobile: customer.mobile },
        ...(customer.email ? [{ email: customer.email }] : []),
      ],
    });

    // 5. Permanently remove customer document
    await Customer.deleteOne({ _id: customer._id });

    await recordAudit(
      'Customer Account Permanently Deleted',
      actor || customer.name || 'Customer',
      `Permanently deleted customer account "${customer.name}" (${customer.customerId || customer.mobile}) and all associated records from database`,
      'system'
    );

    broadcast('CUSTOMER_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: `Account for "${customer.name}" has been permanently deleted from the database.`,
      id: customer._id,
    });
  } catch (err) {
    console.error('Customer deletion failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Unable to delete account right now.',
    });
  }
};

const deleteOwnCustomerAccount = async (req, res) => {
  return deleteCustomer(req, res);
};

// Assign delivery partner to customer
const assignPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId, deliveryBoyName, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let resolvedBoyName = '';
    let resolvedBoyId = '';

    if (deliveryBoyId) {
      const lookup = deliveryBoyId.length === 24
        ? [{ _id: deliveryBoyId }, { mobile: deliveryBoyId }]
        : [{ mobile: deliveryBoyId }];
      let boy = await DeliveryBoy.findOne({ $or: lookup }).lean();

      if (!boy) {
        const user = await User.findOne({
          $or: lookup,
          role: 'delivery_boy',
        }).lean();
        if (user?.mobile) {
          boy = await DeliveryBoy.findOne({ mobile: user.mobile }).lean();
        }
        if (!boy && user) {
          resolvedBoyId = user._id.toString();
          resolvedBoyName = user.name;
        }
      }

      if (boy) {
        resolvedBoyId = boy._id.toString();
        resolvedBoyName = boy.name;
      }

      if (!resolvedBoyId) {
        return res.status(404).json({ success: false, message: 'Selected delivery partner could not be found.' });
      }
    } else if (deliveryBoyName) {
      return res.status(400).json({ success: false, message: 'Choose a valid delivery partner.' });
    }

    customer.deliveryPlan = customer.deliveryPlan || {};
    customer.deliveryPlan.deliveryBoyId = resolvedBoyId;
    customer.deliveryPlan.deliveryBoyName = resolvedBoyName;
    await customer.save();

    // Ensure today's delivery schedule is up to date
    const today = formatDate();
    await ensureDeliveriesForDate(today);

    // Keep pending deliveries assigned consistently with the customer's current route.
    const custIds = [customer.customerId, customer._id.toString()];
    await Delivery.updateMany(
      {
        customerId: { $in: custIds },
        status: 'pending',
      },
      {
        $set: {
          deliveryBoyId: resolvedBoyId,
          deliveryBoyName: resolvedBoyName,
        },
      }
    );

    // Send instant notification to delivery partner
    if (resolvedBoyId) {
      try {
        await Notification.create({
          recipientRole: 'delivery_boy',
          recipientId: resolvedBoyId,
          title: '📦 New Customer Assigned',
          message: `Dairy Admin assigned customer ${customer.name} (${customer.deliveryPlan?.milkQty || 1}L Milk, ${customer.area}) to your delivery route.`,
          type: 'delivery_assigned',
          data: {
            customerId: customer.customerId,
            customerName: customer.name,
            customerAddress: customer.address,
            customerPhone: customer.mobile,
            deliveryBoyId: resolvedBoyId,
            deliveryBoyName: resolvedBoyName,
          },
        });
      } catch (notifErr) {
        console.warn('Driver notification error:', notifErr.message);
      }
    }

    await recordAudit(
      'Partner Assigned to Customer',
      actor || 'Admin',
      `Assigned partner "${resolvedBoyName || 'None'}" to customer ${customer.name} (${customer.customerId})`,
      'customer'
    );

    broadcast('CUSTOMER_UPDATED', { id: customer._id.toString() });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});

    return res.json({
      success: true,
      message: `Successfully assigned ${resolvedBoyName || 'partner'} to ${customer.name}`,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Customer-only deletion of their own history entries
const deleteCustomerHistoryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const delivery = await Delivery.findById(entryId);
    if (delivery) {
      delivery.deletedForCustomer = true;
      await delivery.save();
      broadcast('CUSTOMER_UPDATED', { customerId: delivery.customerId });
      return res.json({ success: true, message: 'History entry deleted.' });
    }

    const payment = await Payment.findById(entryId);
    if (payment) {
      payment.deletedForCustomer = true;
      await payment.save();
      broadcast('CUSTOMER_UPDATED', { customerId: payment.customerId });
      return res.json({ success: true, message: 'History entry deleted.' });
    }

    return res.status(404).json({ success: false, message: 'History entry not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const clearCustomerHistory = async (req, res) => {
  try {
    const customerId = req.params.id;
    const query = customerId.length === 24 ? { _id: customerId } : { customerId };
    const customer = await Customer.findOne(query).lean();
    const custIds = customer ? [customer._id.toString(), customer.customerId] : [customerId];

    await Promise.all([
      Delivery.updateMany({ customerId: { $in: custIds } }, { $set: { deletedForCustomer: true } }),
      Payment.updateMany({ customerId: { $in: custIds } }, { $set: { deletedForCustomer: true } }),
    ]);

    broadcast('CUSTOMER_UPDATED', { customerId });
    return res.json({ success: true, message: 'All customer history cleared.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to find customer from authenticated user
const findCustomerFromReqUser = async (user) => {
  if (!user) return null;
  let customer = null;
  if (user.id && user.id.length === 24) {
    try {
      customer = await Customer.findById(user.id);
    } catch (e) {
      customer = null;
    }
  }
  if (!customer && user.mobile) {
    customer = await Customer.findOne({ mobile: user.mobile });
  }
  if (!customer && user.email) {
    customer = await Customer.findOne({ email: user.email });
  }
  if (!customer && user.customerId) {
    customer = await Customer.findOne({ customerId: user.customerId });
  }
  return customer;
};

// Helper to notify Admin & Delivery Partner on address changes
const notifyAddressUpdate = async (customer, formattedAddress, actionDescription = 'updated delivery address') => {
  try {
    const fullAddress = formattedAddress || [customer.address, customer.landmark, customer.area].filter(Boolean).join(', ');

    // 1. Notification to Admin
    await Notification.create({
      recipientRole: 'admin',
      recipientId: '',
      title: '📍 Customer Delivery Address Updated',
      message: `${customer.name} (${customer.customerId}) ${actionDescription}: ${fullAddress}`,
      type: 'route_update',
      data: {
        customerId: customer.customerId,
        customerName: customer.name,
        customerPhone: customer.mobile,
        address: fullAddress,
        area: customer.area,
        deliveryBoyId: customer.deliveryPlan?.deliveryBoyId || '',
        deliveryBoyName: customer.deliveryPlan?.deliveryBoyName || '',
      },
    });

    // 2. Notification to Delivery Partner (if assigned)
    const driverId = customer.deliveryPlan?.deliveryBoyId;
    if (driverId) {
      await Notification.create({
        recipientRole: 'delivery_boy',
        recipientId: String(driverId),
        title: '📍 Customer Address Updated',
        message: `${customer.name} on your route ${actionDescription}: ${fullAddress}`,
        type: 'route_update',
        data: {
          customerId: customer.customerId,
          customerName: customer.name,
          customerPhone: customer.mobile,
          address: fullAddress,
          area: customer.area,
        },
      });
    }

    // 3. Sync all pending deliveries for this customer
    await Delivery.updateMany(
      {
        $or: [
          { customerId: customer._id.toString() },
          { customerId: customer.customerId },
          { customerPhone: customer.mobile },
        ],
        status: 'pending',
      },
      {
        $set: {
          customerAddress: fullAddress,
        },
      }
    );

    // 4. WebSocket Broadcasts
    broadcast('CUSTOMER_UPDATED', { customerId: customer.customerId, id: customer._id.toString() });
    broadcast('DELIVERY_UPDATED', {});
    broadcast('NOTIFICATION_UPDATED', {});
  } catch (err) {
    console.error('notifyAddressUpdate error:', err.message);
  }
};

// GET /api/customers/me/addresses
const getCustomerAddresses = async (req, res) => {
  try {
    const customer = await findCustomerFromReqUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    // Seed default address if customer.addresses is empty
    if (!Array.isArray(customer.addresses) || customer.addresses.length === 0) {
      const defaultAddr = {
        id: `addr_${Date.now()}_default`,
        type: 'home',
        label: 'Home',
        flatNo: '',
        apartmentStreet: customer.address || '',
        area: customer.area || 'Madhapur',
        landmark: customer.landmark || '',
        city: 'Hyderabad',
        pincode: '500081',
        deliveryInstructions: '',
        isDefault: true,
        createdAt: customer.createdAt || new Date(),
        updatedAt: new Date(),
      };
      customer.addresses = [defaultAddr];
      await customer.save();
    }

    return res.json({
      success: true,
      addresses: customer.addresses,
      activeAddress: customer.address,
      activeArea: customer.area,
    });
  } catch (err) {
    console.error('getCustomerAddresses error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve addresses.' });
  }
};

// POST /api/customers/me/addresses
const addCustomerAddress = async (req, res) => {
  try {
    const customer = await findCustomerFromReqUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    const {
      type = 'home',
      label = 'Home',
      flatNo = '',
      apartmentStreet = '',
      area = 'Madhapur',
      landmark = '',
      city = 'Hyderabad',
      pincode = '',
      deliveryInstructions = '',
      isDefault = false,
    } = req.body;

    if (!apartmentStreet && !flatNo) {
      return res.status(400).json({ success: false, message: 'Street or building address is required.' });
    }

    if (!Array.isArray(customer.addresses)) {
      customer.addresses = [];
    }

    const shouldBeDefault = Boolean(isDefault) || customer.addresses.length === 0;

    if (shouldBeDefault) {
      customer.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddr = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: ['home', 'work', 'other'].includes(type) ? type : 'home',
      label: (label || (type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Other')).trim(),
      flatNo: (flatNo || '').trim(),
      apartmentStreet: (apartmentStreet || '').trim(),
      area: (area || 'Madhapur').trim(),
      landmark: (landmark || '').trim(),
      city: (city || 'Hyderabad').trim(),
      pincode: (pincode || '').trim(),
      deliveryInstructions: (deliveryInstructions || '').trim(),
      isDefault: shouldBeDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    customer.addresses.push(newAddr);

    const formattedAddress = [
      newAddr.flatNo,
      newAddr.apartmentStreet,
      newAddr.landmark ? `(Near ${newAddr.landmark})` : '',
      newAddr.area,
      newAddr.city,
      newAddr.pincode,
    ].filter(Boolean).join(', ');

    if (shouldBeDefault) {
      customer.address = [newAddr.flatNo, newAddr.apartmentStreet].filter(Boolean).join(', ') || newAddr.area;
      customer.area = newAddr.area;
      customer.landmark = newAddr.landmark;

      // Also sync delivery partner based on area if available
      try {
        const matchedLoc = await DeliveryLocation.findOne({
          name: { $regex: new RegExp(`^${newAddr.area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        }).lean();
        if (matchedLoc && matchedLoc.assignedPartnerId) {
          customer.deliveryPlan = {
            ...(customer.deliveryPlan || {}),
            deliveryBoyId: matchedLoc.assignedPartnerId,
            deliveryBoyName: matchedLoc.assignedPartnerName || '',
          };
        }
      } catch (locErr) {
        console.warn('Location lookup warning on address add:', locErr.message);
      }

      await User.updateMany(
        { mobile: customer.mobile, role: { $in: ['customer', 'user'] } },
        { $set: { address: customer.address, assignedArea: customer.area } }
      );
    }

    await customer.save();

    // Trigger Admin and Delivery Boy notification
    await notifyAddressUpdate(customer, formattedAddress, shouldBeDefault ? 'added a new default delivery address' : 'added a new delivery address');

    return res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      address: newAddr,
      addresses: customer.addresses,
      activeAddress: customer.address,
      activeArea: customer.area,
    });
  } catch (err) {
    console.error('addCustomerAddress error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add address.' });
  }
};

// PUT /api/customers/me/addresses/:addressId
const updateCustomerAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await findCustomerFromReqUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    if (!Array.isArray(customer.addresses)) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    const addrIndex = customer.addresses.findIndex((a) => a.id === addressId);
    if (addrIndex === -1) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    const target = customer.addresses[addrIndex];
    const {
      type,
      label,
      flatNo,
      apartmentStreet,
      area,
      landmark,
      city,
      pincode,
      deliveryInstructions,
      isDefault,
    } = req.body;

    if (type !== undefined) target.type = ['home', 'work', 'other'].includes(type) ? type : target.type;
    if (label !== undefined) target.label = label.trim();
    if (flatNo !== undefined) target.flatNo = flatNo.trim();
    if (apartmentStreet !== undefined) target.apartmentStreet = apartmentStreet.trim();
    if (area !== undefined) target.area = area.trim();
    if (landmark !== undefined) target.landmark = landmark.trim();
    if (city !== undefined) target.city = city.trim();
    if (pincode !== undefined) target.pincode = pincode.trim();
    if (deliveryInstructions !== undefined) target.deliveryInstructions = deliveryInstructions.trim();
    target.updatedAt = new Date();

    const makeDefault = Boolean(isDefault);
    if (makeDefault) {
      customer.addresses.forEach((a, idx) => {
        a.isDefault = idx === addrIndex;
      });
      target.isDefault = true;
    }

    if (target.isDefault) {
      customer.address = [target.flatNo, target.apartmentStreet].filter(Boolean).join(', ') || target.area;
      customer.area = target.area;
      customer.landmark = target.landmark;

      if (target.area) {
        try {
          const matchedLoc = await DeliveryLocation.findOne({
            name: { $regex: new RegExp(`^${target.area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isActive: true,
          }).lean();
          if (matchedLoc && matchedLoc.assignedPartnerId) {
            customer.deliveryPlan = {
              ...(customer.deliveryPlan || {}),
              deliveryBoyId: matchedLoc.assignedPartnerId,
              deliveryBoyName: matchedLoc.assignedPartnerName || '',
            };
          }
        } catch (locErr) {
          console.warn('Location lookup warning on address update:', locErr.message);
        }
      }

      await User.updateMany(
        { mobile: customer.mobile, role: { $in: ['customer', 'user'] } },
        { $set: { address: customer.address, assignedArea: customer.area } }
      );
    }

    await customer.save();

    const formattedAddress = [
      target.flatNo,
      target.apartmentStreet,
      target.landmark ? `(Near ${target.landmark})` : '',
      target.area,
      target.city,
      target.pincode,
    ].filter(Boolean).join(', ');

    // Notify Admin and Partner
    await notifyAddressUpdate(customer, formattedAddress, 'updated delivery address');

    return res.json({
      success: true,
      message: 'Address updated successfully.',
      address: target,
      addresses: customer.addresses,
      activeAddress: customer.address,
      activeArea: customer.area,
    });
  } catch (err) {
    console.error('updateCustomerAddress error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update address.' });
  }
};

// DELETE /api/customers/me/addresses/:addressId
const deleteCustomerAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await findCustomerFromReqUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    if (!Array.isArray(customer.addresses) || customer.addresses.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    const addrIndex = customer.addresses.findIndex((a) => a.id === addressId);
    if (addrIndex === -1) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (customer.addresses.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your only delivery address. You can update it instead.',
      });
    }

    const wasDefault = customer.addresses[addrIndex].isDefault;
    customer.addresses.splice(addrIndex, 1);

    if (wasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
      const newDef = customer.addresses[0];
      customer.address = [newDef.flatNo, newDef.apartmentStreet].filter(Boolean).join(', ') || newDef.area;
      customer.area = newDef.area;
      customer.landmark = newDef.landmark;

      await User.updateMany(
        { mobile: customer.mobile, role: { $in: ['customer', 'user'] } },
        { $set: { address: customer.address, assignedArea: customer.area } }
      );
    }

    await customer.save();

    const activeDef = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
    const formattedAddress = [
      activeDef.flatNo,
      activeDef.apartmentStreet,
      activeDef.area,
    ].filter(Boolean).join(', ');

    await notifyAddressUpdate(customer, formattedAddress, 'deleted an address');

    return res.json({
      success: true,
      message: 'Address removed successfully.',
      addresses: customer.addresses,
      activeAddress: customer.address,
      activeArea: customer.area,
    });
  } catch (err) {
    console.error('deleteCustomerAddress error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete address.' });
  }
};

// PUT /api/customers/me/addresses/:addressId/default
const setDefaultCustomerAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await findCustomerFromReqUser(req.user);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    if (!Array.isArray(customer.addresses)) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    const target = customer.addresses.find((a) => a.id === addressId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    customer.addresses.forEach((a) => {
      a.isDefault = a.id === addressId;
    });

    customer.address = [target.flatNo, target.apartmentStreet].filter(Boolean).join(', ') || target.area;
    customer.area = target.area;
    customer.landmark = target.landmark;

    if (target.area) {
      try {
        const matchedLoc = await DeliveryLocation.findOne({
          name: { $regex: new RegExp(`^${target.area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        }).lean();
        if (matchedLoc && matchedLoc.assignedPartnerId) {
          customer.deliveryPlan = {
            ...(customer.deliveryPlan || {}),
            deliveryBoyId: matchedLoc.assignedPartnerId,
            deliveryBoyName: matchedLoc.assignedPartnerName || '',
          };
        }
      } catch (locErr) {
        console.warn('Location lookup warning on set default address:', locErr.message);
      }
    }

    await User.updateMany(
      { mobile: customer.mobile, role: { $in: ['customer', 'user'] } },
      { $set: { address: customer.address, assignedArea: customer.area } }
    );

    await customer.save();

    const formattedAddress = [
      target.flatNo,
      target.apartmentStreet,
      target.landmark ? `(Near ${target.landmark})` : '',
      target.area,
      target.city,
      target.pincode,
    ].filter(Boolean).join(', ');

    // Notify Admin and Partner
    await notifyAddressUpdate(customer, formattedAddress, 'switched default delivery address to');

    return res.json({
      success: true,
      message: 'Default delivery address set successfully.',
      addresses: customer.addresses,
      activeAddress: customer.address,
      activeArea: customer.area,
    });
  } catch (err) {
    console.error('setDefaultCustomerAddress error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to set default address.' });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateOwnCustomerProfile,
  deleteOwnCustomerAccount,
  deleteCustomer,
  assignPartner,
  pauseDelivery,
  resumeDelivery,
  setTemporaryQty,
  getCustomerLedger,
  sendCustomerCredentials,
  deleteCustomerHistoryEntry,
  clearCustomerHistory,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
};
