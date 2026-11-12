const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const DeliveryBoy = require('../models/DeliveryBoy');
const CashHandover = require('../models/CashHandover');
const { ensureDeliveriesForDate, formatDate } = require('../services/deliveryService');
const {
  generateCustomerPdfReport,
  generatePartnerPdfReport,
  generateAdminPdfReport,
  generateAllCustomersPdfReport,
} = require('../services/pdfReportService');

// Admin Dashboard Summary
const getDashboardSummary = async (req, res) => {
  try {
    const today = req.query.date || formatDate();
    await ensureDeliveriesForDate(today);

    const [todayDeliveries, totalCustomers, activeCustomers, payments] = await Promise.all([
      Delivery.find({ deliveryDate: today, deletedForAdmin: { $ne: true } }).lean(),
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

    const todayPaymentList = payments.filter((p) => {
      if (!p.paymentDate) return false;
      return formatDate(new Date(p.paymentDate)) === today;
    });
    const todayPayments = todayPaymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const todayCashFromPayments = todayPaymentList
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const todayUpiFromPayments = todayPaymentList
      .filter((p) => p.paymentMethod === 'upi')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const todayDeliveryCash = deliveredItems.reduce((sum, d) => {
      if (d.paymentMethod === 'cash') return sum + (Number(d.paymentAmount ?? d.totalAmount) || 0);
      if (d.addonPaymentMethod === 'cash') return sum + (Number(d.addonPaidAmount ?? d.paymentAmount) || 0);
      return sum;
    }, 0);
    const todayDeliveryUpi = deliveredItems.reduce((sum, d) => {
      if (d.paymentMethod === 'upi') return sum + (Number(d.paymentAmount ?? d.totalAmount) || 0);
      if (d.addonPaymentMethod === 'upi') return sum + (Number(d.addonPaidAmount ?? d.paymentAmount) || 0);
      return sum;
    }, 0);
    const todayAddonsCash = deliveredItems.reduce((sum, d) => (d.addonPaymentMethod === 'cash' ? sum + (Number(d.addonPaidAmount) || 0) : sum), 0);
    const todayAddonsUpi = deliveredItems.reduce((sum, d) => (d.addonPaymentMethod === 'upi' ? sum + (Number(d.addonPaidAmount) || 0) : sum), 0);

    const todayCashCollected = Math.max(todayCashFromPayments, todayDeliveryCash);
    const todayUpiCollected = Math.max(todayUpiFromPayments, todayDeliveryUpi);
    const effectivePaymentsCollected = Math.max(todayPayments, todayCashCollected + todayUpiCollected);

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
        paymentsCollected: effectivePaymentsCollected,
        todayCashCollected,
        todayUpiCollected,
        todayAddonsCash,
        todayAddonsUpi,
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

// Helper to calculate date ranges for reports
const getDateRange = (period = 'all') => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let startDate = null;
  let periodLabel = 'Entire History (All-Time)';

  const p = String(period || 'all').toLowerCase().trim();
  if (p === 'weekly' || p === 'week' || p === '7days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().split('T')[0];
    periodLabel = `Weekly (${startDate} to ${todayStr})`;
  } else if (p === 'monthly' || p === 'month' || p === '30days') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split('T')[0];
    periodLabel = `Monthly (${startDate} to ${todayStr})`;
  } else {
    periodLabel = `Entire History (Through ${todayStr})`;
  }

  return { startDate, todayStr, periodLabel, period: p };
};

// Download Customer PDF Report (Weekly / Monthly / Entire History)
const downloadCustomerPdf = async (req, res) => {
  try {
    let lookupId = req.query.customerId || req.query.id;
    if ((!lookupId || lookupId === 'me') && req.user && ['customer', 'user'].includes(req.user.role)) {
      lookupId = req.user.customerId || req.user.id || req.user.mobile;
    }

    if (!lookupId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    const query = /^[a-f\d]{24}$/i.test(lookupId)
      ? { $or: [{ _id: lookupId }, { customerId: lookupId }] }
      : { $or: [{ customerId: lookupId }, { mobile: lookupId }] };

    const customer = await Customer.findOne(query).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const custIds = [customer._id.toString(), customer.customerId, customer.mobile].filter(Boolean);
    const { startDate, periodLabel, period } = getDateRange(req.query.period);

    const deliveryQuery = {
      customerId: { $in: custIds },
      deletedForCustomer: { $ne: true },
    };
    if (startDate) {
      deliveryQuery.deliveryDate = { $gte: startDate };
    }

    const paymentQuery = {
      customerId: { $in: custIds },
      deletedForCustomer: { $ne: true },
    };
    if (startDate) {
      paymentQuery.paymentDate = { $gte: new Date(startDate + 'T00:00:00.000Z') };
    }

    const [deliveries, payments] = await Promise.all([
      Delivery.find(deliveryQuery).sort({ deliveryDate: -1 }).lean(),
      Payment.find(paymentQuery).sort({ paymentDate: -1 }).lean(),
    ]);

    const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Statement_${safeName}_${period}.pdf"`);

    await generateCustomerPdfReport({ customer, deliveries, payments, periodLabel, res });
  } catch (err) {
    console.error('downloadCustomerPdf error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

// Download Delivery Partner PDF Report (Weekly / Monthly / Entire History)
const downloadPartnerPdf = async (req, res) => {
  try {
    let lookupId = req.query.partnerId || req.query.id || req.user?.boyId || req.user?.id;

    let partner = null;
    if (lookupId && /^[a-f\d]{24}$/i.test(lookupId)) {
      partner = await DeliveryBoy.findById(lookupId).lean();
    }
    if (!partner && lookupId) {
      partner = await DeliveryBoy.findOne({ $or: [{ mobile: lookupId }, { name: lookupId }] }).lean();
    }
    if (!partner && req.user?.mobile) {
      partner = await DeliveryBoy.findOne({ mobile: req.user.mobile }).lean();
    }
    if (!partner) {
      partner = {
        _id: req.user?.id || 'partner_id',
        name: req.user?.name || 'Delivery Partner',
        mobile: req.user?.mobile || '',
        assignedArea: req.user?.assignedArea || 'Madhapur Route',
        isOnline: true,
        vehicleNumber: 'Standard Dairy Route',
      };
    }

    const partnerKeys = [partner._id?.toString(), partner.id, partner.mobile, partner.name].filter(Boolean);
    const { startDate, periodLabel, period } = getDateRange(req.query.period);

    const deliveryQuery = {
      deletedForDriver: { $ne: true },
      $or: [
        { deliveryBoyId: { $in: partnerKeys } },
        { deliveryBoyName: partner.name },
      ],
    };
    if (partner.assignedArea) {
      deliveryQuery.$or.push({ customerArea: partner.assignedArea });
    }
    if (startDate) {
      deliveryQuery.deliveryDate = { $gte: startDate };
    }

    const collectionQuery = {
      $or: [
        { deliveryBoyId: { $in: partnerKeys } },
        { collectedBy: partner.name },
      ],
    };
    if (startDate) {
      collectionQuery.paymentDate = { $gte: new Date(startDate + 'T00:00:00.000Z') };
    }

    const handoverQuery = {
      $or: [
        { deliveryBoyId: { $in: partnerKeys } },
        { deliveryBoyName: partner.name },
        { deliveryBoyMobile: partner.mobile },
      ],
    };
    if (startDate) {
      handoverQuery.createdAt = { $gte: new Date(startDate + 'T00:00:00.000Z') };
    }

    const [deliveries, collections, handovers] = await Promise.all([
      Delivery.find(deliveryQuery).sort({ deliveryDate: -1 }).lean(),
      Payment.find(collectionQuery).sort({ paymentDate: -1 }).lean(),
      CashHandover.find(handoverQuery).sort({ createdAt: -1 }).lean(),
    ]);

    const safeName = (partner.name || 'Partner').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Route_Report_${safeName}_${period}.pdf"`);

    await generatePartnerPdfReport({ partner, deliveries, collections, handovers, periodLabel, res });
  } catch (err) {
    console.error('downloadPartnerPdf error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

// Download Admin Consolidated Executive PDF Report (Weekly / Monthly / Entire History)
const downloadAdminPdf = async (req, res) => {
  try {
    const { startDate, periodLabel, period } = getDateRange(req.query.period);

    const deliveryQuery = { deletedForAdmin: { $ne: true } };
    if (startDate) {
      deliveryQuery.deliveryDate = { $gte: startDate };
    }

    const paymentQuery = {};
    if (startDate) {
      paymentQuery.paymentDate = { $gte: new Date(startDate + 'T00:00:00.000Z') };
    }

    const [deliveries, payments, partners, customers, handovers] = await Promise.all([
      Delivery.find(deliveryQuery).sort({ deliveryDate: -1 }).lean(),
      Payment.find(paymentQuery).sort({ paymentDate: -1 }).lean(),
      DeliveryBoy.find({}).lean(),
      Customer.find({}).select('currentBalance status').lean(),
      CashHandover.find({ status: 'accepted' }).lean(),
    ]);

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.status === 'active').length;
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter((d) => d.status === 'delivered');
    const completed = completedDeliveries.length;
    const notDelivered = deliveries.filter((d) => d.status === 'not_delivered').length;
    const pending = deliveries.filter((d) => d.status === 'pending').length;

    const totalSales = completedDeliveries.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const paymentsCollected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalOutstanding = customers.reduce((s, c) => s + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalAdvance = customers.reduce((s, c) => s + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0), 0);
    const totalMilkLitres = completedDeliveries.reduce((s, d) => s + (d.actualMilk || d.plannedMilk || 0), 0);
    const totalCurdKg = completedDeliveries.reduce((s, d) => s + (d.actualCurd || d.plannedCurd || 0), 0) / 1000;
    const fulfillmentRate = totalDeliveries > 0 ? ((completed / totalDeliveries) * 100).toFixed(1) : '100.0';

    const summary = {
      totalCustomers,
      activeCustomers,
      totalDeliveries,
      completed,
      notDelivered,
      pending,
      totalSales,
      paymentsCollected,
      totalOutstanding,
      totalAdvance,
      totalMilkLitres: totalMilkLitres.toFixed(1),
      totalCurdKg: totalCurdKg.toFixed(2),
      fulfillmentRate,
    };

    const partnerPerformance = partners.map((p) => {
      const pKeys = [p._id.toString(), p.mobile, p.name];
      const pDeliveries = deliveries.filter((d) => pKeys.includes(d.deliveryBoyId) || d.deliveryBoyName === p.name);
      const pCompleted = pDeliveries.filter((d) => d.status === 'delivered');
      const pMilkLitres = pCompleted.reduce((s, d) => s + (d.actualMilk || d.plannedMilk || 0), 0);
      const pPayments = payments.filter((pay) => pKeys.includes(pay.deliveryBoyId) || pay.collectedBy === p.name);
      const pCash = pPayments
        .filter((pay) => (pay.paymentMethod || '').toLowerCase() === 'cash')
        .reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const pHandedOver = handovers
        .filter((h) => pKeys.includes(h.deliveryBoyId) || h.deliveryBoyName === p.name)
        .reduce((s, h) => s + (Number(h.amount) || 0), 0);

      return {
        name: p.name,
        area: p.assignedArea || 'General Area',
        total: pDeliveries.length,
        completed: pCompleted.length,
        milkLitres: pMilkLitres,
        cashCollected: pCash,
        handedOver: pHandedOver,
      };
    });

    const trendMap = {};
    deliveries.forEach((d) => {
      const dt = d.deliveryDate || '-';
      if (!trendMap[dt]) {
        trendMap[dt] = { date: dt, completed: 0, milkLitres: 0, curdKg: 0, sales: 0, collected: 0 };
      }
      if (d.status === 'delivered') {
        trendMap[dt].completed += 1;
        trendMap[dt].milkLitres += d.actualMilk || d.plannedMilk || 0;
        trendMap[dt].curdKg += (d.actualCurd || d.plannedCurd || 0) / 1000;
        trendMap[dt].sales += d.totalAmount || 0;
      }
    });

    payments.forEach((p) => {
      const dt = p.paymentDate instanceof Date ? p.paymentDate.toISOString().split('T')[0] : String(p.paymentDate).split('T')[0];
      if (!trendMap[dt]) {
        trendMap[dt] = { date: dt, completed: 0, milkLitres: 0, curdKg: 0, sales: 0, collected: 0 };
      }
      trendMap[dt].collected += Number(p.amount) || 0;
    });

    const dailyTrends = Object.values(trendMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Dairy_Executive_Report_${period}.pdf"`);

    await generateAdminPdfReport({
      summary,
      partnerPerformance,
      dailyTrends,
      recentPayments: payments.slice(0, 20),
      periodLabel,
      res,
    });
  } catch (err) {
    console.error('downloadAdminPdf error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

// Download All Customers Consolidated PDF Report
const downloadAllCustomersPdf = async (req, res) => {
  try {
    const { startDate, periodLabel, period } = getDateRange(req.query.period);

    const deliveryQuery = { deletedForAdmin: { $ne: true } };
    if (startDate) deliveryQuery.deliveryDate = { $gte: startDate };

    const paymentQuery = {};
    if (startDate) paymentQuery.paymentDate = { $gte: new Date(startDate + 'T00:00:00.000Z') };

    const [customers, deliveries, payments] = await Promise.all([
      Customer.find({}).sort({ name: 1 }).lean(),
      Delivery.find(deliveryQuery).lean(),
      Payment.find(paymentQuery).lean(),
    ]);

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalAdvance = 0;

    const customersData = customers.map((c) => {
      const cIds = [c._id.toString(), c.customerId, c.mobile].filter(Boolean);
      const cDeliveries = deliveries.filter((d) => cIds.includes(d.customerId) && d.status === 'delivered');
      const cPayments = payments.filter((p) => cIds.includes(p.customerId));

      const billed = cDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
      const paid = cPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const milkLitres = cDeliveries.reduce((sum, d) => sum + (d.actualMilk || d.plannedMilk || 0), 0);

      totalBilled += billed;
      totalPaid += paid;
      if (c.currentBalance > 0) totalOutstanding += c.currentBalance;
      if (c.currentBalance < 0) totalAdvance += Math.abs(c.currentBalance);

      return {
        id: c._id.toString(),
        customerId: c.customerId || '',
        name: c.name || 'Customer',
        mobile: c.mobile || '',
        area: c.area || '',
        deliveriesCount: cDeliveries.length,
        milkLitres,
        totalBilled: billed,
        totalPaid: paid,
        currentBalance: c.currentBalance || 0,
        status: c.status || 'active',
      };
    });

    const summary = {
      totalCustomers: customers.length,
      activeCount: customers.filter((c) => c.status === 'active').length,
      totalDeliveries: deliveries.filter((d) => d.status === 'delivered').length,
      totalBilled,
      totalPaid,
      totalOutstanding,
      totalAdvance,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="All_Customers_Report_${period}.pdf"`);

    await generateAllCustomersPdfReport({ customersData, summary, periodLabel, res });
  } catch (err) {
    console.error('downloadAllCustomersPdf error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = {
  getDashboardSummary,
  getPendingCreditReport,
  getCustomerStatement,
  getAuditLogs,
  downloadCustomerPdf,
  downloadPartnerPdf,
  downloadAdminPdf,
  downloadAllCustomersPdf,
};
