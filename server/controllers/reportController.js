const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const { ensureDeliveriesForDate, formatDate } = require('../services/deliveryService');

// Admin Dashboard Summary
const getDashboardSummary = async (req, res) => {
  try {
    const today = req.query.date || formatDate();
    await ensureDeliveriesForDate(today);

    const [todayDeliveries, totalCustomers, activeCustomers, payments] = await Promise.all([
      Delivery.find({ deliveryDate: today }).lean(),
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Payment.find({}).lean(),
    ]);

    const completed = todayDeliveries.filter((d) => d.status === 'delivered').length;
    const pending = todayDeliveries.filter((d) => d.status === 'pending').length;
    const notDelivered = todayDeliveries.filter((d) => d.status === 'not_delivered').length;

    const deliveredItems = todayDeliveries.filter((d) => d.status === 'delivered');
    const todaySales = deliveredItems.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const creditAdded = deliveredItems
      .filter((d) => d.paymentMethod === 'credit')
      .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    const todayPayments = payments
      .filter((p) => {
        const pDate = p.paymentDate instanceof Date ? p.paymentDate.toISOString().split('T')[0] : String(p.paymentDate).split('T')[0];
        return pDate === today;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const allCustomers = await Customer.find({}).select('currentBalance').lean();
    const totalOutstanding = allCustomers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalAdvance = allCustomers.reduce((sum, c) => sum + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0), 0);

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
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Pending Credit Report
const getPendingCreditReport = async (req, res) => {
  try {
    const { sortBy = 'highest' } = req.query;

    let list = await Customer.find({ currentBalance: { $gt: 0 } }).lean();

    const formattedList = list.map((c) => ({
      id: c._id.toString(),
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
      formattedList.sort((a, b) => b.outstanding - a.outstanding);
    } else if (sortBy === 'oldest') {
      formattedList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'name') {
      formattedList.sort((a, b) => a.name.localeCompare(b.name));
    }

    const totalOutstanding = formattedList.reduce((sum, c) => sum + c.outstanding, 0);

    return res.json({
      success: true,
      count: formattedList.length,
      totalOutstanding,
      customers: formattedList,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Customer Monthly Statement
const getCustomerStatement = async (req, res) => {
  try {
    const { customerId, month = '2026-10' } = req.query;
    const query = customerId.length === 24 ? { _id: customerId } : { customerId };
    const customer = await Customer.findOne(query).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const custIds = [customer._id.toString(), customer.customerId];

    const [deliveries, payments] = await Promise.all([
      Delivery.find({
        customerId: { $in: custIds },
        deliveryDate: { $regex: `^${month}` },
        status: 'delivered',
      }).lean(),
      Payment.find({
        customerId: { $in: custIds },
      }).lean(),
    ]);

    const monthPayments = payments.filter((p) => {
      const pDate = p.paymentDate instanceof Date ? p.paymentDate.toISOString() : String(p.paymentDate);
      return pDate.startsWith(month);
    });

    const totalMilk = deliveries.reduce((sum, d) => sum + (d.actualMilk || 0), 0);
    const totalCurdKg = deliveries.reduce((sum, d) => sum + (d.actualCurd || 0), 0) / 1000;
    const milkAmount = deliveries.reduce((sum, d) => sum + (d.actualMilk * (d.milkPrice || 60)), 0);
    const curdAmount = deliveries.reduce((sum, d) => sum + ((d.actualCurd / 500) * (d.curdPrice || 30)), 0);
    const grossBill = milkAmount + curdAmount;
    const totalPaid = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

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
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Audit logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(200).lean();
    return res.json({
      success: true,
      count: logs.length,
      logs: logs.map((l) => ({
        ...l,
        id: l._id.toString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
};
