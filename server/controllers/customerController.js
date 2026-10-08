const Customer = require('../models/Customer');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const DeliveryBoy = require('../models/DeliveryBoy');
const { recordAudit } = require('../services/auditService');

// Get all customers with search and filters
const getCustomers = async (req, res) => {
  try {
    const { search, status, area, deliveryBoyId } = req.query;
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

    // Find driver name if assigned
    let boyName = '';
    if (deliveryBoyId) {
      const boy = await DeliveryBoy.findOne(
        deliveryBoyId.length === 24 ? { _id: deliveryBoyId } : { mobile: deliveryBoyId }
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
      area: area || 'Andheri West',
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
        deliveryBoyId: deliveryBoyId || '',
        deliveryBoyName: boyName,
        startDate: new Date(),
      },
      paymentInfo: {
        paymentType: paymentType || 'credit',
        paymentCycle: paymentCycle || 'monthly',
      },
      currentBalance: Number(initialBalance) || 0,
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

    const updateData = { ...req.body };
    if (boyName) {
      updateData['deliveryPlan.deliveryBoyName'] = boyName;
    }

    const updated = await Customer.findOneAndUpdate(query, { $set: updateData }, { new: true });

    if (req.body.password && req.body.password.trim()) {
      await User.findOneAndUpdate(
        { mobile: updated.mobile },
        { $set: { password: req.body.password.trim() } }
      );
    }

    await recordAudit(
      'Customer Updated',
      req.body.actor || 'Admin',
      `Updated details for ${updated.name} (${updated.customerId})`,
      'customer'
    );

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
    if (reason) customer.notes = `${customer.notes ? customer.notes + ' | ' : ''}Pause: ${reason}`;
    await customer.save();

    await recordAudit(
      'Customer Delivery Paused',
      actor || 'Admin',
      `Paused ${customer.name} from ${pauseFrom} to ${pauseUntil}${reason ? ` (${reason})` : ''}`,
      'customer'
    );

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
    await customer.save();

    await recordAudit('Customer Delivery Resumed', actor || 'Admin', `Resumed active delivery for ${customer.name}`, 'customer');

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

    await recordAudit(
      'Temporary Quantity Changed',
      actor || 'Admin',
      `Temporary quantity for ${customer.name} on ${date}: ${milkQty}L Milk, ${curdQty}g Curd`,
      'customer'
    );

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

    // Deliveries and payments for this customer
    const [customerDeliveries, customerPayments] = await Promise.all([
      Delivery.find({ customerId: { $in: custIds } }).lean(),
      Payment.find({ customerId: { $in: custIds } }).lean(),
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
        rawItem: del,
      });
    });

    customerPayments.forEach((pay) => {
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
    const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  pauseDelivery,
  resumeDelivery,
  setTemporaryQty,
  getCustomerLedger,
  sendCustomerCredentials,
};
