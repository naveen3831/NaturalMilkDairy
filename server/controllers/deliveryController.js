const store = require('../storage/store');

// Format date as YYYY-MM-DD
const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's or selected date deliveries
const getDeliveries = (req, res) => {
  const date = req.query.date || formatDate();
  const { status, deliveryBoyId, search } = req.query;

  // Auto-generate scheduled deliveries for this date if not already generated
  store.ensureDeliveriesForDate(date);

  let list = store.data.deliveries.filter((d) => d.deliveryDate === date);

  if (deliveryBoyId && deliveryBoyId !== 'all') {
    list = list.filter((d) => d.deliveryBoyId === deliveryBoyId);
  }

  if (status && status !== 'all') {
    list = list.filter((d) => d.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (d) =>
        d.customerName.toLowerCase().includes(q) ||
        (d.customerAddress && d.customerAddress.toLowerCase().includes(q)) ||
        (d.customerPhone && d.customerPhone.includes(q))
    );
  }

  // Summary counts
  const total = list.length;
  const delivered = list.filter((d) => d.status === 'delivered').length;
  const pending = list.filter((d) => d.status === 'pending').length;
  const notDelivered = list.filter((d) => d.status === 'not_delivered').length;

  return res.json({
    success: true,
    date,
    summary: { total, delivered, pending, notDelivered },
    deliveries: list,
  });
};

// Mark delivery as Delivered (1 or 2-tap fast UX flow)
const markDelivered = (req, res) => {
  const { id } = req.params;
  const {
    actualMilk,
    actualCurd,
    paymentMethod, // 'credit' | 'cash' | 'upi' | 'advance'
    notes,
    actor,
    collectedAmount,
  } = req.body;

  const delivery = store.data.deliveries.find((d) => d.id === id);
  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery record not found' });
  }

  const customer = store.data.customers.find((c) => c.id === delivery.customerId);

  const milk = actualMilk !== undefined ? Number(actualMilk) : delivery.plannedMilk;
  const curd = actualCurd !== undefined ? Number(actualCurd) : delivery.plannedCurd;
  const milkPrice = delivery.milkPrice || 60;
  const curdPrice = delivery.curdPrice || 30; // ₹30 per 500g

  const totalAmount = milk * milkPrice + (curd / 500) * curdPrice;
  const method = paymentMethod || delivery.paymentMethod || 'credit';

  delivery.actualMilk = milk;
  delivery.actualCurd = curd;
  delivery.totalAmount = totalAmount;
  delivery.status = 'delivered';
  delivery.deliveredAt = new Date().toISOString();
  delivery.paymentMethod = method;
  delivery.paymentStatus = method === 'credit' ? 'credit' : 'paid';
  if (notes) delivery.notes = notes;

  // Handle financial ledger rules
  if (customer) {
    if (method === 'credit') {
      // Rule 1: Delivered on credit -> add to customer outstanding balance
      customer.currentBalance += totalAmount;
    } else if (method === 'cash' || method === 'upi') {
      // Immediate payment collected at delivery
      const paid = collectedAmount !== undefined ? Number(collectedAmount) : totalAmount;
      delivery.paymentAmount = paid;

      const prevBal = customer.currentBalance;
      // If customer had an existing balance and paid, net change = (totalAmount - paid)
      customer.currentBalance = prevBal + (totalAmount - paid);

      // Record in Payment ledger
      store.data.payments.push({
        id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        customerId: customer.id,
        customerName: customer.name,
        amount: paid,
        paymentMethod: method,
        paymentDate: new Date().toISOString(),
        collectedBy: actor || delivery.deliveryBoyName || 'Delivery Boy',
        deliveryBoyId: delivery.deliveryBoyId,
        referenceNumber: `${method.toUpperCase()}-DELIVERY-${formatDate()}`,
        previousBalance: prevBal,
        newBalance: customer.currentBalance,
        notes: `Collected during delivery on ${delivery.deliveryDate}`,
        createdAt: new Date().toISOString(),
      });

      // Update Delivery Boy's daily collection stats
      const boy = store.data.deliveryBoys.find((b) => b.id === delivery.deliveryBoyId);
      if (boy) {
        if (method === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + paid;
        if (method === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paid;
      }
    } else if (method === 'advance') {
      // Consumes from existing advance credit
      customer.currentBalance += totalAmount;
    }
  }

  store.addAudit(
    'Delivery Completed',
    actor || delivery.deliveryBoyName || 'Delivery Boy',
    `Delivered ${milk}L Milk + ${curd}g Curd to ${delivery.customerName} (₹${totalAmount} via ${method.toUpperCase()})`,
    'delivery'
  );

  store.save();

  return res.json({
    success: true,
    message: 'Delivery marked completed successfully',
    delivery,
    customerBalance: customer ? customer.currentBalance : 0,
  });
};

// Mark delivery as Not Delivered
const markNotDelivered = (req, res) => {
  const { id } = req.params;
  const { reason, notes, actor } = req.body;

  const delivery = store.data.deliveries.find((d) => d.id === id);
  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery record not found' });
  }

  delivery.status = 'not_delivered';
  delivery.notDeliveredReason = reason || 'Customer Not Home';
  delivery.actualMilk = 0;
  delivery.actualCurd = 0;
  delivery.totalAmount = 0; // Rule 2: Not Delivered -> No charge by default
  delivery.deliveredAt = new Date().toISOString();
  if (notes) delivery.notes = notes;

  store.addAudit(
    'Delivery Marked Not Delivered',
    actor || delivery.deliveryBoyName || 'Delivery Boy',
    `${delivery.customerName} - Reason: ${delivery.notDeliveredReason}${notes ? ` (${notes})` : ''}`,
    'delivery'
  );

  store.save();

  return res.json({
    success: true,
    message: 'Delivery marked as Not Delivered (no charge applied)',
    delivery,
  });
};

// Batch sync for offline mode
const batchSyncOfflineDeliveries = (req, res) => {
  const { offlineActions } = req.body; // array of { type: 'delivered'|'not_delivered', id, data }

  if (!Array.isArray(offlineActions) || offlineActions.length === 0) {
    return res.json({ success: true, count: 0, message: 'No offline actions to sync' });
  }

  let syncedCount = 0;
  offlineActions.forEach((item) => {
    const delivery = store.data.deliveries.find((d) => d.id === item.id);
    if (!delivery) return;

    if (item.type === 'delivered') {
      delivery.status = 'delivered';
      delivery.actualMilk = item.data?.actualMilk ?? delivery.plannedMilk;
      delivery.actualCurd = item.data?.actualCurd ?? delivery.plannedCurd;
      delivery.paymentMethod = item.data?.paymentMethod || 'credit';
      delivery.totalAmount = delivery.actualMilk * (delivery.milkPrice || 60) + (delivery.actualCurd / 500) * (delivery.curdPrice || 30);
      delivery.deliveredAt = item.data?.timestamp || new Date().toISOString();
      syncedCount++;
    } else if (item.type === 'not_delivered') {
      delivery.status = 'not_delivered';
      delivery.notDeliveredReason = item.data?.reason || 'Customer Not Home';
      delivery.totalAmount = 0;
      syncedCount++;
    }
  });

  store.addAudit('Offline Sync Completed', 'System', `Synced ${syncedCount} offline deliveries`, 'system');
  store.save();

  return res.json({
    success: true,
    count: syncedCount,
    message: `Successfully synchronized ${syncedCount} offline deliveries`,
  });
};

module.exports = {
  getDeliveries,
  markDelivered,
  markNotDelivered,
  batchSyncOfflineDeliveries,
};
