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
      customers: customers.map((c) => ({
        ...c,
        id: c._id.toString(),
      })),
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

    return res.json({
      success: true,
      customer: {
        ...customer,
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
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

    if (!name || !mobile || !address) {
      return res.status(400).json({ success: false, message: 'Name, mobile and address are required' });
    }

    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const customerPassword = password ? password.trim() : `${cleanName.split(' ')[0].toLowerCase()}@123`;
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
    let boyName = '';
    let finalDeliveryBoyId = deliveryBoyId || '';
    const isDriver = req.user?.role === 'delivery_boy';

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
      password: customerPassword,
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
          password: customerPassword,
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

    return res.status(201).json({
      success: true,
      customer: {
        ...newCustomer.toObject(),
        id: newCustomer._id.toString(),
      },
      temporaryPassword: customerPassword,
      emailSent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const existingCust = await Customer.findOne(query);
    if (!existingCust) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

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

    const updateData = { ...req.body };
    if (req.body.milkQty !== undefined) {
      updateData['deliveryPlan.milkQty'] = Number(req.body.milkQty);
    }
    if (req.body.milkUnit !== undefined) {
      updateData['deliveryPlan.milkUnit'] = req.body.milkUnit;
    }
    if (req.body.curdQty !== undefined) {
      updateData['deliveryPlan.curdQty'] = Number(req.body.curdQty);
    }
    if (req.body.curdUnit !== undefined) {
      updateData['deliveryPlan.curdUnit'] = req.body.curdUnit;
    }
    if (req.body.frequency !== undefined) {
      updateData['deliveryPlan.frequency'] = req.body.frequency;
    }
    if (req.body.deliveryBoyId !== undefined) {
      updateData['deliveryPlan.deliveryBoyId'] = req.body.deliveryBoyId;
    }
    if (boyName) {
      updateData['deliveryPlan.deliveryBoyName'] = boyName;
    }
    if (req.body.paymentType !== undefined) {
      updateData['paymentInfo.paymentType'] = req.body.paymentType;
    }
    if (req.body.paymentCycle !== undefined) {
      updateData['paymentInfo.paymentCycle'] = req.body.paymentCycle;
    }

    const updated = await Customer.findOneAndUpdate(query, { $set: updateData }, { new: true });

    // Sync auth User record
    const userUpdate = {};
    if (req.body.name) userUpdate.name = req.body.name.trim();
    if (req.body.email) userUpdate.email = req.body.email.trim().toLowerCase();
    if (req.body.mobile) userUpdate.mobile = req.body.mobile.trim();
    if (req.body.password && req.body.password.trim()) userUpdate.password = req.body.password.trim();
    if (Object.keys(userUpdate).length > 0) {
      await User.findOneAndUpdate(
        { $or: [{ mobile: existingCust.mobile }, { mobile: updated.mobile }] },
        { $set: userUpdate }
      );
    }

    await recordAudit(
      'Customer Updated',
      req.body.actor || 'Admin',
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
    const password = customer.password || user?.password || `${customer.name.split(' ')[0].toLowerCase()}@123`;

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
};
