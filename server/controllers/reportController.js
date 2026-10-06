const store = require('../storage/store');

const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Admin Dashboard Summary (PRD Section 22)
const getDashboardSummary = (req, res) => {
  const today = req.query.date || formatDate();
  store.ensureDeliveriesForDate(today);

  const todayDeliveries = store.data.deliveries.filter((d) => d.deliveryDate === today);
  const totalCustomers = store.data.customers.length;
  const activeCustomers = store.data.customers.filter((c) => c.status === 'active').length;

  const completed = todayDeliveries.filter((d) => d.status === 'delivered').length;
  const pending = todayDeliveries.filter((d) => d.status === 'pending').length;
  const notDelivered = todayDeliveries.filter((d) => d.status === 'not_delivered').length;

  // Financials for today
  const deliveredItems = todayDeliveries.filter((d) => d.status === 'delivered');
  const todaySales = deliveredItems.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  const creditAdded = deliveredItems
    .filter((d) => d.paymentMethod === 'credit')
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  // Today's payments collected from both delivery collection and payments log
  const todayPayments = store.data.payments
    .filter((p) => {
      const pDate = typeof p.paymentDate === 'string' ? p.paymentDate.split('T')[0] : '';
      return pDate === today;
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Total Outstanding across all customers
  const totalOutstanding = store.data.customers.reduce((sum, c) => {
    return sum + (c.currentBalance > 0 ? c.currentBalance : 0);
  }, 0);

  // Total advance held by customers
  const totalAdvance = store.data.customers.reduce((sum, c) => {
    return sum + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0);
  }, 0);

  // Total litres milk & kg curd for today
  const todayMilkLitres = deliveredItems.reduce((sum, d) => sum + (d.actualMilk || 0), 0);
  const todayCurdKg = deliveredItems.reduce((sum, d) => sum + (d.actualCurd || 0), 0) / 1000;

  return res.json({
    success: true,
    date: today,
    summary: {
      totalCustomers,
      activeCustomers,
      deliveriesCount: todayDeliveries.length,
      completed,
      pending,
      notDelivered,
      todaySales,
      creditAdded,
      paymentsCollected: todayPayments,
      totalOutstanding,
      totalAdvance,
      todayMilkLitres: todayMilkLitres.toFixed(1),
      todayCurdKg: todayCurdKg.toFixed(2),
    },
  });
};

// Pending Credit Report (PRD Section 24)
const getPendingCreditReport = (req, res) => {
  const { sortBy = 'highest' } = req.query; // 'highest' | 'oldest' | 'name'

  let list = store.data.customers
    .filter((c) => c.currentBalance > 0)
    .map((c) => ({
      id: c.id,
      customerId: c.customerId,
      name: c.name,
      mobile: c.mobile,
      area: c.area,
      address: c.address,
      outstanding: c.currentBalance,
      lastDeliveryPlan: c.deliveryPlan,
      createdAt: c.createdAt,
    }));

  if (sortBy === 'highest') {
    list.sort((a, b) => b.outstanding - a.outstanding);
  } else if (sortBy === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalOutstanding = list.reduce((sum, c) => sum + c.outstanding, 0);

  return res.json({
    success: true,
    count: list.length,
    totalOutstanding,
    customers: list,
  });
};

// Customer Monthly Statement (PRD Section 15 & 16)
const getCustomerStatement = (req, res) => {
  const { customerId, month = '2026-10' } = req.query;
  const customer = store.data.customers.find((c) => c.id === customerId || c.customerId === customerId);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const deliveries = store.data.deliveries.filter(
    (d) => d.customerId === customer.id && d.deliveryDate.startsWith(month) && d.status === 'delivered'
  );

  const payments = store.data.payments.filter((p) => {
    const pDate = typeof p.paymentDate === 'string' ? p.paymentDate : '';
    return p.customerId === customer.id && pDate.startsWith(month);
  });

  const totalMilk = deliveries.reduce((sum, d) => sum + (d.actualMilk || 0), 0);
  const totalCurdKg = deliveries.reduce((sum, d) => sum + (d.actualCurd || 0), 0) / 1000;
  const milkAmount = deliveries.reduce((sum, d) => sum + (d.actualMilk * (d.milkPrice || 60)), 0);
  const curdAmount = deliveries.reduce((sum, d) => sum + ((d.actualCurd / 500) * (d.curdPrice || 30)), 0);
  const grossBill = milkAmount + curdAmount;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return res.json({
    success: true,
    statement: {
      dairyName: 'Natural Milk Dairy',
      tagline: 'Natural • Pure • Healthy',
      customer: {
        id: customer.customerId,
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        area: customer.area,
      },
      period: month,
      totalDeliveries: deliveries.length,
      totalMilkLitres: totalMilk.toFixed(1),
      totalCurdKg: totalCurdKg.toFixed(2),
      milkAmount,
      curdAmount,
      grossBill,
      totalPaid,
      outstanding: customer.currentBalance,
      generatedAt: new Date().toISOString(),
    },
  });
};

// Audit logs (PRD Section 33)
const getAuditLogs = (req, res) => {
  return res.json({ success: true, count: store.data.auditLogs.length, logs: store.data.auditLogs });
};

module.exports = {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
};
