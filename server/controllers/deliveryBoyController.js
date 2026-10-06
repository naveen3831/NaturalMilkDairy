const store = require('../storage/store');

const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDeliveryBoys = (req, res) => {
  const today = formatDate();
  const boys = store.data.deliveryBoys.map((boy) => {
    // Deliveries assigned to this boy today
    const boyDeliveries = store.data.deliveries.filter(
      (d) => d.deliveryDate === today && (d.deliveryBoyId === boy.id || d.deliveryBoyName === boy.name)
    );

    const completed = boyDeliveries.filter((d) => d.status === 'delivered').length;
    const pending = boyDeliveries.filter((d) => d.status === 'pending').length;
    const notDelivered = boyDeliveries.filter((d) => d.status === 'not_delivered').length;

    // Direct deliveries on credit
    const creditAmount = boyDeliveries
      .filter((d) => d.status === 'delivered' && d.paymentMethod === 'credit')
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return {
      ...boy,
      todayStats: {
        total: boyDeliveries.length,
        completed,
        pending,
        notDelivered,
        cashCollected: boy.todayCashCollected || 0,
        upiCollected: boy.todayUpiCollected || 0,
        totalCollected: (boy.todayCashCollected || 0) + (boy.todayUpiCollected || 0),
        creditDelivered: creditAmount,
      },
    };
  });

  return res.json({ success: true, deliveryBoys: boys });
};

const addDeliveryBoy = (req, res) => {
  const { name, mobile, assignedArea, vehicleNumber, password, actor } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
  }

  const id = 'usr_boy_' + Date.now();
  const newBoy = {
    id,
    name,
    mobile,
    assignedArea: assignedArea || 'Andheri West',
    vehicleNumber: vehicleNumber || '',
    status: 'active',
    todayCashCollected: 0,
    todayUpiCollected: 0,
  };

  store.data.deliveryBoys.push(newBoy);

  // Also create user account so they can log in
  store.data.users.push({
    id,
    name,
    mobile,
    password: password || '123',
    role: 'delivery_boy',
    assignedArea: assignedArea || 'Andheri West',
    status: 'active',
  });

  store.addAudit('Delivery Boy Registered', actor || 'Admin', `Added ${name} (${mobile}) for ${assignedArea}`, 'system');
  store.save();

  return res.status(201).json({ success: true, deliveryBoy: newBoy });
};

// Cash Collection Reconciliation (PRD Section 28)
const reconcileCash = (req, res) => {
  const { id } = req.params;
  const { cashVerified, upiVerified, notes, actor } = req.body;

  const boy = store.data.deliveryBoys.find((b) => b.id === id);
  if (!boy) {
    return res.status(404).json({ success: false, message: 'Delivery boy not found' });
  }

  const total = (boy.todayCashCollected || 0) + (boy.todayUpiCollected || 0);

  store.addAudit(
    'Collection Reconciled',
    actor || 'Admin',
    `Verified daily collection of ₹${total} (Cash: ₹${boy.todayCashCollected}, UPI: ₹${boy.todayUpiCollected}) for ${boy.name}${notes ? `. Notes: ${notes}` : ''}`,
    'payment'
  );

  // Reset or mark reconciled for today
  boy.lastReconciledAt = new Date().toISOString();
  boy.lastReconciledTotal = total;
  boy.todayCashCollected = 0;
  boy.todayUpiCollected = 0;

  store.save();

  return res.json({
    success: true,
    message: `Collection of ₹${total} reconciled successfully for ${boy.name}`,
    reconciledAt: boy.lastReconciledAt,
  });
};

module.exports = { getDeliveryBoys, addDeliveryBoy, reconcileCash };
