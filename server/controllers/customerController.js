const store = require('../storage/store');

// Get all customers with search and filters
const getCustomers = (req, res) => {
  const { search, status, area, deliveryBoyId } = req.query;
  let customers = [...store.data.customers];

  if (search) {
    const q = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q))
    );
  }

  if (status && status !== 'all') {
    customers = customers.filter((c) => c.status === status);
  }

  if (area && area !== 'all') {
    customers = customers.filter((c) => c.area === area);
  }

  if (deliveryBoyId && deliveryBoyId !== 'all') {
    customers = customers.filter((c) => c.deliveryPlan?.deliveryBoyId === deliveryBoyId);
  }

  return res.json({ success: true, count: customers.length, customers });
};

// Get single customer
const getCustomerById = (req, res) => {
  const customer = store.data.customers.find((c) => c.id === req.params.id || c.customerId === req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }
  return res.json({ success: true, customer });
};

// Create customer
const createCustomer = (req, res) => {
  const {
    name,
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
  } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ success: false, message: 'Name, mobile and address are required' });
  }

  const nextNum = store.data.customers.length + 101;
  const customerId = `CUST-${nextNum}`;

  const assignedBoy = store.data.deliveryBoys.find((b) => b.id === deliveryBoyId);

  const newCustomer = {
    id: 'cust_' + Date.now(),
    customerId,
    name,
    mobile,
    whatsapp: whatsapp || mobile,
    address,
    area: area || (assignedBoy ? assignedBoy.assignedArea : 'Andheri West'),
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
      deliveryBoyId: deliveryBoyId || (store.data.deliveryBoys[0] ? store.data.deliveryBoys[0].id : ''),
      deliveryBoyName: assignedBoy ? assignedBoy.name : 'Rahul Sharma',
      startDate: new Date().toISOString().split('T')[0],
    },
    paymentInfo: {
      paymentType: paymentType || 'credit',
      paymentCycle: paymentCycle || 'monthly',
    },
    currentBalance: Number(initialBalance) || 0,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  store.data.customers.push(newCustomer);
  store.addAudit(
    'New Customer Added',
    req.body.actor || 'Admin',
    `Added ${name} (${customerId}) with ${newCustomer.deliveryPlan.milkQty}L Milk daily`,
    'customer'
  );
  store.save();

  return res.status(201).json({ success: true, customer: newCustomer });
};

// Update customer
const updateCustomer = (req, res) => {
  const index = store.data.customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const existing = store.data.customers[index];
  const updated = {
    ...existing,
    ...req.body,
    deliveryPlan: {
      ...existing.deliveryPlan,
      ...(req.body.deliveryPlan || {}),
    },
    paymentInfo: {
      ...existing.paymentInfo,
      ...(req.body.paymentInfo || {}),
    },
  };

  if (req.body.deliveryBoyId) {
    const boy = store.data.deliveryBoys.find((b) => b.id === req.body.deliveryBoyId);
    if (boy) {
      updated.deliveryPlan.deliveryBoyId = boy.id;
      updated.deliveryPlan.deliveryBoyName = boy.name;
    }
  }

  store.data.customers[index] = updated;
  store.addAudit(
    'Customer Updated',
    req.body.actor || 'Admin',
    `Updated details for ${updated.name} (${updated.customerId})`,
    'customer'
  );
  store.save();

  return res.json({ success: true, customer: updated });
};

// Pause delivery
const pauseDelivery = (req, res) => {
  const { pauseFrom, pauseUntil, reason, actor } = req.body;
  const customer = store.data.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  customer.status = 'paused';
  customer.pauseFrom = pauseFrom;
  customer.pauseUntil = pauseUntil;
  if (reason) customer.notes = `${customer.notes ? customer.notes + ' | ' : ''}Pause: ${reason}`;

  store.addAudit(
    'Customer Delivery Paused',
    actor || 'Admin',
    `Paused ${customer.name} from ${pauseFrom} to ${pauseUntil}${reason ? ` (${reason})` : ''}`,
    'customer'
  );
  store.save();

  return res.json({ success: true, customer });
};

// Resume delivery
const resumeDelivery = (req, res) => {
  const { actor } = req.body;
  const customer = store.data.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  customer.status = 'active';
  customer.pauseFrom = null;
  customer.pauseUntil = null;

  store.addAudit('Customer Delivery Resumed', actor || 'Admin', `Resumed active delivery for ${customer.name}`, 'customer');
  store.save();

  return res.json({ success: true, customer });
};

// Temporary quantity change
const setTemporaryQty = (req, res) => {
  const { date, milkQty, curdQty, actor } = req.body;
  const customer = store.data.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  customer.temporaryQty = {
    date,
    milkQty: Number(milkQty),
    curdQty: Number(curdQty),
  };

  store.addAudit(
    'Temporary Quantity Changed',
    actor || 'Admin',
    `Temporary quantity for ${customer.name} on ${date}: ${milkQty}L Milk, ${curdQty}g Curd`,
    'customer'
  );
  store.save();

  return res.json({ success: true, customer });
};

// Complete Customer Ledger
const getCustomerLedger = (req, res) => {
  const customerId = req.params.id;
  const customer = store.data.customers.find((c) => c.id === customerId || c.customerId === customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Get all deliveries for this customer
  const customerDeliveries = store.data.deliveries.filter((d) => d.customerId === customer.id);
  // Get all payments for this customer
  const customerPayments = store.data.payments.filter((p) => p.customerId === customer.id);

  // Combine into unified chronological ledger entries
  const ledgerEntries = [];

  customerDeliveries.forEach((del) => {
    ledgerEntries.push({
      id: del.id,
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
      id: pay.id,
      type: 'payment',
      date: typeof pay.paymentDate === 'string' ? pay.paymentDate.split('T')[0] : new Date(pay.paymentDate).toISOString().split('T')[0],
      time: pay.paymentDate,
      milk: '-',
      curd: '-',
      rateDetails: `Ref: ${pay.referenceNumber || 'N/A'}`,
      amount: -Math.abs(pay.amount), // Payments reduce outstanding balance
      paidAmount: pay.amount,
      status: 'Paid',
      paymentMethod: pay.paymentMethod?.toUpperCase(),
      paymentStatus: 'Recorded',
      notes: pay.notes || `Collected by ${pay.collectedBy}`,
      deliveryBoyName: pay.collectedBy,
      rawItem: pay,
    });
  });

  // Sort chronological ascending
  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let runningBalance = 0;
  ledgerEntries.forEach((entry) => {
    if (entry.type === 'delivery') {
      if (entry.status === 'delivered') {
        if (entry.paymentMethod === 'credit') {
          runningBalance += entry.amount;
        } else if (entry.paymentMethod === 'advance') {
          // consumed from advance, no change to balance
        }
      }
    } else if (entry.type === 'payment') {
      runningBalance -= entry.paidAmount;
    }
    entry.balance = runningBalance;
  });

  // Totals for Statement
  const deliveredList = customerDeliveries.filter((d) => d.status === 'delivered');
  const totalMilkDelivered = deliveredList.reduce((sum, d) => sum + (d.actualMilk || 0), 0);
  const totalCurdDelivered = deliveredList.reduce((sum, d) => sum + (d.actualCurd || 0), 0) / 1000; // in kg
  const grossBill = deliveredList.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Prefilled WhatsApp reminder text
  const waPhone = customer.whatsapp || customer.mobile;
  const balanceText = customer.currentBalance > 0 
    ? `₹${customer.currentBalance} Pending`
    : customer.currentBalance < 0
    ? `₹${Math.abs(customer.currentBalance)} Advance`
    : `₹0 (All Clear)`;
    
  const reminderMessage = encodeURIComponent(
    `Hello ${customer.name},\nGreetings from *Natural Milk Dairy*!\nYour milk & curd delivery account has an outstanding balance of *₹${customer.currentBalance}*.\nKindly make the payment via UPI/Cash. Thank you for choosing fresh & pure dairy!`
  );
  const whatsappUrl = `https://wa.me/91${waPhone.replace(/\D/g, '')}?text=${reminderMessage}`;

  return res.json({
    success: true,
    customer,
    outstanding: customer.currentBalance,
    totalMilkDelivered: `${totalMilkDelivered.toFixed(1)} L`,
    totalCurdDelivered: `${totalCurdDelivered.toFixed(2)} Kg`,
    grossBill,
    totalPaid,
    ledgerEntries,
    whatsappUrl,
  });
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
};
