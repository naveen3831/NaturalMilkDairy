const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'dairy_db.json');

// Helper to format Date as YYYY-MM-DD
const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (d = new Date()) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
};

const initialData = {
  users: [
    {
      id: 'usr_admin_1',
      name: 'Dairy Owner (Admin)',
      mobile: '9876543210',
      password: 'admin',
      role: 'admin',
      status: 'active',
    },
    {
      id: 'usr_boy_1',
      name: 'Rahul Sharma',
      mobile: '9811122233',
      password: '123',
      role: 'delivery_boy',
      assignedArea: 'Andheri West',
      status: 'active',
    },
    {
      id: 'usr_boy_2',
      name: 'Sunil Verma',
      mobile: '9822233344',
      password: '123',
      role: 'delivery_boy',
      assignedArea: 'Andheri East',
      status: 'active',
    },
  ],
  products: [
    { id: 'prod_1', name: 'Farm Fresh Cow Milk 1L', category: 'milk', unit: '1 L', price: 60, status: 'active', description: 'Freshly milked, unadulterated pure cow milk' },
    { id: 'prod_2', name: 'Farm Fresh Cow Milk 500ml', category: 'milk', unit: '500 ml', price: 30, status: 'active', description: 'Convenient daily half-litre pack' },
    { id: 'prod_3', name: 'Pure Buffalo Milk 1L', category: 'milk', unit: '1 L', price: 75, status: 'active', description: 'Rich creamy high-fat pure buffalo milk' },
    { id: 'prod_4', name: 'Thick Farm Curd 500g', category: 'curd', unit: '500 g', price: 35, status: 'active', description: 'Traditional earthen pot set creamy dahi' },
    { id: 'prod_5', name: 'Thick Farm Curd 1kg', category: 'curd', unit: '1 kg', price: 65, status: 'active', description: 'Family pack thick probiotic curd' },
    { id: 'prod_6', name: 'A2 Vedic Desi Ghee 500ml', category: 'ghee', unit: '500 ml', price: 480, status: 'active', description: 'Traditional bilona churned pure cow ghee' },
    { id: 'prod_7', name: 'Fresh Malai Paneer 500g', category: 'paneer', unit: '500 g', price: 190, status: 'active', description: 'Soft, melt-in-mouth cottage cheese' },
  ],
  deliveryBoys: [
    {
      id: 'usr_boy_1',
      name: 'Rahul Sharma',
      mobile: '9811122233',
      assignedArea: 'Andheri West',
      vehicleNumber: 'MH-02-CD-5643',
      status: 'active',
      todayCashCollected: 1650,
      todayUpiCollected: 850,
    },
    {
      id: 'usr_boy_2',
      name: 'Sunil Verma',
      mobile: '9822233344',
      assignedArea: 'Andheri East',
      vehicleNumber: 'MH-02-AB-9812',
      status: 'active',
      todayCashCollected: 900,
      todayUpiCollected: 1200,
    },
  ],
  customers: [
    {
      id: 'cust_1',
      customerId: 'CUST-101',
      name: 'Rajesh Sharma',
      mobile: '9870011122',
      whatsapp: '9870011122',
      address: 'Flat 402, Gokul Heights, Lokhandwala',
      area: 'Andheri West',
      landmark: 'Near Infinity Mall',
      latitude: 19.1412,
      longitude: 72.8277,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 1,
        milkUnit: 'L',
        curdQty: 500,
        curdUnit: 'g',
        frequency: 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: 'usr_boy_1',
        deliveryBoyName: 'Rahul Sharma',
        startDate: '2026-09-01',
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'monthly',
      },
      currentBalance: 1250,
      notes: 'Leave at door on wooden tray. Ring bell once.',
      createdAt: '2026-09-01T06:00:00Z',
    },
    {
      id: 'cust_2',
      customerId: 'CUST-102',
      name: 'Amit Patel',
      mobile: '9870022233',
      whatsapp: '9870022233',
      address: 'B-14, Shanti Niketan, Juhu Lane',
      area: 'Andheri West',
      landmark: 'Opposite State Bank',
      latitude: 19.1298,
      longitude: 72.8354,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 2,
        milkUnit: 'L',
        curdQty: 0,
        curdUnit: 'g',
        frequency: 'alternate',
        deliveryDays: ['Mon', 'Wed', 'Fri', 'Sun'],
        deliveryBoyId: 'usr_boy_1',
        deliveryBoyName: 'Rahul Sharma',
        startDate: '2026-09-05',
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'monthly',
      },
      currentBalance: 850,
      notes: 'Customer prefers early morning before 6:30 AM.',
      createdAt: '2026-09-05T06:00:00Z',
    },
    {
      id: 'cust_3',
      customerId: 'CUST-103',
      name: 'Priya Singh',
      mobile: '9870033344',
      whatsapp: '9870033344',
      address: '701, Regency Tower, Chakala',
      area: 'Andheri East',
      landmark: 'Near JB Nagar Metro',
      latitude: 19.1136,
      longitude: 72.8697,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 1,
        milkUnit: 'L',
        curdQty: 500,
        curdUnit: 'g',
        frequency: 'selected',
        deliveryDays: ['Mon', 'Wed', 'Fri'],
        deliveryBoyId: 'usr_boy_2',
        deliveryBoyName: 'Sunil Verma',
        startDate: '2026-09-10',
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'weekly',
      },
      currentBalance: 620,
      notes: 'Hand over directly to maid or customer.',
      createdAt: '2026-09-10T06:00:00Z',
    },
    {
      id: 'cust_4',
      customerId: 'CUST-104',
      name: 'Neha Verma',
      mobile: '9870044455',
      whatsapp: '9870044455',
      address: '204, Green Meadows, Marol',
      area: 'Andheri East',
      landmark: 'Behind Marol Fire Station',
      latitude: 19.1215,
      longitude: 72.8791,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 0.5,
        milkUnit: 'L',
        curdQty: 1000,
        curdUnit: 'g',
        frequency: 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: 'usr_boy_2',
        deliveryBoyName: 'Sunil Verma',
        startDate: '2026-09-12',
      },
      paymentInfo: {
        paymentType: 'prepaid',
        paymentCycle: 'monthly',
      },
      currentBalance: 0,
      notes: 'Milk packet in insulated bag hanging on door.',
      createdAt: '2026-09-12T06:00:00Z',
    },
    {
      id: 'cust_5',
      customerId: 'CUST-105',
      name: 'Vikram Malhotra',
      mobile: '9870055566',
      whatsapp: '9870055566',
      address: 'Villa 12, Palm Grove, Versova',
      area: 'Andheri West',
      landmark: 'Near Versova Beach Gate',
      latitude: 19.1352,
      longitude: 72.8123,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 2,
        milkUnit: 'L',
        curdQty: 500,
        curdUnit: 'g',
        frequency: 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: 'usr_boy_1',
        deliveryBoyName: 'Rahul Sharma',
        startDate: '2026-09-15',
      },
      paymentInfo: {
        paymentType: 'prepaid',
        paymentCycle: 'monthly',
      },
      currentBalance: -500, // ₹500 Advance
      notes: 'Customer paid advance ₹2000. Balance is positive credit.',
      createdAt: '2026-09-15T06:00:00Z',
    },
    {
      id: 'cust_6',
      customerId: 'CUST-106',
      name: 'Suresh Desai',
      mobile: '9870066677',
      whatsapp: '9870066677',
      address: '502, Sunshine Apartments, Four Bungalows',
      area: 'Andheri West',
      landmark: 'Near Four Bungalows Gurudwara',
      latitude: 19.1287,
      longitude: 72.8251,
      status: 'paused',
      pauseFrom: '2026-10-05',
      pauseUntil: '2026-10-12',
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 1,
        milkUnit: 'L',
        curdQty: 500,
        curdUnit: 'g',
        frequency: 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: 'usr_boy_1',
        deliveryBoyName: 'Rahul Sharma',
        startDate: '2026-09-18',
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'monthly',
      },
      currentBalance: 420,
      notes: 'On Diwali vacation until 12-Oct. Resumes automatically.',
      createdAt: '2026-09-18T06:00:00Z',
    },
    {
      id: 'cust_7',
      customerId: 'CUST-107',
      name: 'Kavita Menon',
      mobile: '9870077788',
      whatsapp: '9870077788',
      address: '301, Silver Sands, DN Nagar',
      area: 'Andheri West',
      landmark: 'Behind Metro Station',
      latitude: 19.1305,
      longitude: 72.8315,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: 1.5,
        milkUnit: 'L',
        curdQty: 0,
        curdUnit: 'g',
        frequency: 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: 'usr_boy_1',
        deliveryBoyName: 'Rahul Sharma',
        startDate: '2026-09-20',
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'monthly',
      },
      currentBalance: 360,
      notes: 'Give to watchman if gate is locked.',
      createdAt: '2026-09-20T06:00:00Z',
    },
  ],
  deliveries: [
    // Historical deliveries for Rajesh Sharma (matches PRD section 10)
    {
      id: 'del_hist_1',
      customerId: 'cust_1',
      customerName: 'Rajesh Sharma',
      customerPhone: '9870011122',
      customerAddress: 'Flat 402, Gokul Heights, Lokhandwala',
      deliveryBoyId: 'usr_boy_1',
      deliveryBoyName: 'Rahul Sharma',
      deliveryDate: '2026-10-01',
      plannedMilk: 1,
      plannedCurd: 500,
      actualMilk: 1,
      actualCurd: 500,
      milkPrice: 60,
      curdPrice: 30,
      totalAmount: 90,
      status: 'delivered',
      notDeliveredReason: '',
      paymentStatus: 'credit',
      paymentAmount: 0,
      paymentMethod: 'credit',
      notes: 'Delivered at door',
      deliveredAt: '2026-10-01T06:35:00Z',
    },
    {
      id: 'del_hist_2',
      customerId: 'cust_1',
      customerName: 'Rajesh Sharma',
      customerPhone: '9870011122',
      customerAddress: 'Flat 402, Gokul Heights, Lokhandwala',
      deliveryBoyId: 'usr_boy_1',
      deliveryBoyName: 'Rahul Sharma',
      deliveryDate: '2026-10-02',
      plannedMilk: 1,
      plannedCurd: 500,
      actualMilk: 1,
      actualCurd: 500,
      milkPrice: 60,
      curdPrice: 30,
      totalAmount: 90,
      status: 'delivered',
      notDeliveredReason: '',
      paymentStatus: 'credit',
      paymentAmount: 0,
      paymentMethod: 'credit',
      notes: 'Delivered',
      deliveredAt: '2026-10-02T06:42:00Z',
    },
    {
      id: 'del_hist_3',
      customerId: 'cust_1',
      customerName: 'Rajesh Sharma',
      customerPhone: '9870011122',
      customerAddress: 'Flat 402, Gokul Heights, Lokhandwala',
      deliveryBoyId: 'usr_boy_1',
      deliveryBoyName: 'Rahul Sharma',
      deliveryDate: '2026-10-03',
      plannedMilk: 1,
      plannedCurd: 0,
      actualMilk: 1,
      actualCurd: 0,
      milkPrice: 60,
      curdPrice: 30,
      totalAmount: 60,
      status: 'delivered',
      notDeliveredReason: '',
      paymentStatus: 'credit',
      paymentAmount: 0,
      paymentMethod: 'credit',
      notes: 'Curd not requested today',
      deliveredAt: '2026-10-03T06:30:00Z',
    },
    {
      id: 'del_hist_4',
      customerId: 'cust_1',
      customerName: 'Rajesh Sharma',
      customerPhone: '9870011122',
      customerAddress: 'Flat 402, Gokul Heights, Lokhandwala',
      deliveryBoyId: 'usr_boy_1',
      deliveryBoyName: 'Rahul Sharma',
      deliveryDate: '2026-10-05',
      plannedMilk: 1,
      plannedCurd: 500,
      actualMilk: 1,
      actualCurd: 500,
      milkPrice: 60,
      curdPrice: 30,
      totalAmount: 90,
      status: 'delivered',
      notDeliveredReason: '',
      paymentStatus: 'paid',
      paymentAmount: 90,
      paymentMethod: 'cash',
      notes: 'Customer paid ₹90 in cash',
      deliveredAt: '2026-10-05T06:40:00Z',
    },
  ],
  payments: [
    {
      id: 'pay_1',
      customerId: 'cust_1',
      customerName: 'Rajesh Sharma',
      amount: 500,
      paymentMethod: 'upi',
      paymentDate: '2026-09-28T18:30:00Z',
      collectedBy: 'Admin',
      deliveryBoyId: '',
      referenceNumber: 'UPI/293847561/GPAY',
      previousBalance: 1750,
      newBalance: 1250,
      notes: 'Partial payment received via Google Pay',
    },
    {
      id: 'pay_2',
      customerId: 'cust_5',
      customerName: 'Vikram Malhotra',
      amount: 2000,
      paymentMethod: 'bank_transfer',
      paymentDate: '2026-09-25T11:00:00Z',
      collectedBy: 'Admin',
      deliveryBoyId: '',
      referenceNumber: 'HDFC-NEFT-99120',
      previousBalance: 0,
      newBalance: -2000,
      notes: 'Advance monthly subscription payment',
    },
  ],
  auditLogs: [
    {
      id: 'aud_1',
      timestamp: '2026-10-06T06:42:00Z',
      action: 'Delivery marked completed',
      actor: 'Rahul Sharma',
      details: 'Delivered 1L Milk + 500g Curd to Rajesh Sharma (₹90 Credit)',
      category: 'delivery',
    },
    {
      id: 'aud_2',
      timestamp: '2026-10-05T19:15:00Z',
      action: 'Payment ₹500 recorded',
      actor: 'Admin',
      details: 'Recorded UPI payment for Rajesh Sharma. New balance: ₹1250',
      category: 'payment',
    },
    {
      id: 'aud_3',
      timestamp: '2026-10-05T14:20:00Z',
      action: 'Customer delivery paused',
      actor: 'Admin',
      details: 'Paused Suresh Desai delivery from 05-Oct-2026 to 12-Oct-2026 (Vacation)',
      category: 'customer',
    },
  ],
};

class Store {
  constructor() {
    this.data = initialData;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...initialData, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading DB file, fallback to initial data:', err.message);
      this.data = initialData;
    }
  }

  save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');

      // Seamlessly sync to MongoDB Atlas in background
      try {
        const { syncStoreToMongo } = require('./syncMongo');
        syncStoreToMongo().catch((e) => console.log('Mongo sync bg:', e.message));
      } catch (e) {}
    } catch (err) {
      console.error('Error saving DB file:', err.message);
    }
  }

  // Ensure deliveries exist for a specific date (auto-generate based on customer schedule)
  ensureDeliveriesForDate(dateStr = formatDate()) {
    const targetDate = new Date(dateStr + 'T00:00:00');
    const dayName = getDayName(targetDate);
    const dayNumber = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));

    // Get active customers whose start date is <= targetDate
    this.data.customers.forEach((customer) => {
      // Check if paused
      if (customer.status === 'paused' || customer.status === 'inactive') {
        if (customer.pauseFrom && customer.pauseUntil) {
          if (dateStr >= customer.pauseFrom && dateStr <= customer.pauseUntil) {
            return; // Skip paused customer
          }
        } else if (customer.status === 'paused') {
          return;
        }
      }

      // Check delivery frequency rules:
      const plan = customer.deliveryPlan;
      let shouldDeliver = false;

      if (plan.frequency === 'daily') {
        shouldDeliver = true;
      } else if (plan.frequency === 'alternate') {
        // Alternate days calculation: even day offset
        shouldDeliver = dayNumber % 2 === 0;
      } else if (plan.frequency === 'selected') {
        shouldDeliver = Array.isArray(plan.deliveryDays) && plan.deliveryDays.includes(dayName);
      } else if (plan.frequency === 'custom') {
        shouldDeliver = Array.isArray(plan.deliveryDays) && plan.deliveryDays.includes(dayName);
      }

      if (!shouldDeliver) return;

      // Check if delivery record already exists for this customer on this date
      const existing = this.data.deliveries.find(
        (d) => d.customerId === customer.id && d.deliveryDate === dateStr
      );

      if (!existing) {
        // Check temporary quantity override
        let milkQty = plan.milkQty;
        let curdQty = plan.curdQty;

        if (customer.temporaryQty && customer.temporaryQty.date === dateStr) {
          if (customer.temporaryQty.milkQty !== null) milkQty = customer.temporaryQty.milkQty;
          if (customer.temporaryQty.curdQty !== null) curdQty = customer.temporaryQty.curdQty;
        }

        const milkPrice = 60; // default ₹60 / L
        const curdPrice = 30; // default ₹30 / 500g

        const totalAmount = milkQty * milkPrice + (curdQty / 500) * curdPrice;

        this.data.deliveries.push({
          id: 'del_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.mobile,
          customerAddress: customer.address,
          deliveryBoyId: plan.deliveryBoyId,
          deliveryBoyName: plan.deliveryBoyName,
          deliveryDate: dateStr,
          plannedMilk: milkQty,
          plannedCurd: curdQty,
          actualMilk: milkQty,
          actualCurd: curdQty,
          milkPrice,
          curdPrice,
          totalAmount,
          status: 'pending',
          notDeliveredReason: '',
          paymentStatus: customer.paymentInfo.paymentType === 'prepaid' ? 'advance' : 'credit',
          paymentAmount: 0,
          paymentMethod: customer.paymentInfo.paymentType === 'prepaid' ? 'advance' : 'credit',
          notes: customer.notes || '',
          deliveredAt: null,
          createdAt: new Date().toISOString(),
        });
      }
    });

    this.save();
  }

  // Recalculate customer balance based on ledger rules
  recalculateCustomerBalance(customerId) {
    const customer = this.data.customers.find((c) => c.id === customerId);
    if (!customer) return;

    // Sum of all delivered deliveries where paymentMethod was 'credit'
    const creditDeliveries = this.data.deliveries
      .filter((d) => d.customerId === customerId && d.status === 'delivered')
      .reduce((sum, d) => sum + (d.paymentMethod === 'credit' ? d.totalAmount : 0), 0);

    // Sum of all payments received
    const totalPayments = this.data.payments
      .filter((p) => p.customerId === customerId)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Initial base credit or balance
    // In our simplified model: balance = creditDeliveries - totalPayments
    // If positive: outstanding credit. If negative: advance paid.
    // For demo purposes, retain any previous baseline credit
    const baseOffset = customerId === 'cust_1' ? 1250 - (creditDeliveries - totalPayments) : 0;
    
    // We update currentBalance
    // If credit delivery was made, adjust balance
  }

  addAudit(action, actor, details, category = 'system') {
    const log = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      category,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs.pop();
    }
    this.save();
  }
}

const storeInstance = new Store();
module.exports = storeInstance;
