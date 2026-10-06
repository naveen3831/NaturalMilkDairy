const store = require('../storage/store');
const User = require('../models/User');
const Customer = require('../models/Customer');

const login = async (req, res) => {
  const { mobile, password, role } = req.body;

  // 1. Direct role selection demo shortcut
  if (!mobile && role) {
    if (role === 'customer') {
      const cust = store.data.customers[0] || { id: 'cust_1', name: 'Rajesh Sharma', mobile: '9820011223' };
      return res.json({
        success: true,
        user: {
          id: cust.id,
          name: cust.name,
          mobile: cust.mobile,
          role: 'customer',
          customerId: cust.customerId || 'CUST-101',
          area: cust.area || 'Andheri West',
        },
        token: `token_cust_${cust.id}_${Date.now()}`,
      });
    }

    const u = store.data.users.find((user) => user.role === role) || store.data.users[0];
    return res.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        role: u.role,
        assignedArea: u.assignedArea || 'All Areas',
      },
      token: `token_${u.id}_${Date.now()}`,
    });
  }

  // 2. Search in users collection (Admin / Delivery Boy)
  let foundUser = store.data.users.find((u) => u.mobile === mobile);
  if (foundUser) {
    // If password matches or demo pass
    if (!password || foundUser.password === password || password === 'admin' || password === '123' || password === '123456') {
      return res.json({
        success: true,
        user: {
          id: foundUser.id,
          name: foundUser.name,
          mobile: foundUser.mobile,
          role: foundUser.role,
          assignedArea: foundUser.assignedArea || 'All Areas',
        },
        token: `token_${foundUser.id}_${Date.now()}`,
      });
    }
  }

  // 3. Search in customers collection (Customer Login)
  let foundCustomer = store.data.customers.find((c) => c.mobile === mobile);
  if (foundCustomer) {
    return res.json({
      success: true,
      user: {
        id: foundCustomer.id,
        name: foundCustomer.name,
        mobile: foundCustomer.mobile,
        role: 'customer',
        customerId: foundCustomer.customerId || 'CUST-101',
        area: foundCustomer.area || 'Andheri West',
      },
      token: `token_cust_${foundCustomer.id}_${Date.now()}`,
    });
  }

  // 4. Fallback for demo or unrecognized credentials
  const defaultUser = role === 'customer'
    ? { id: 'cust_1', name: 'Rajesh Sharma', mobile: mobile || '9820011223', role: 'customer' }
    : store.data.users.find((u) => u.role === role) || store.data.users[0];

  return res.json({
    success: true,
    user: {
      id: defaultUser.id,
      name: defaultUser.name,
      mobile: defaultUser.mobile,
      role: defaultUser.role,
      assignedArea: defaultUser.assignedArea || 'All Areas',
    },
    token: `token_${defaultUser.id}_${Date.now()}`,
  });
};

const register = async (req, res) => {
  const {
    name,
    mobile,
    password,
    role = 'customer',
    address,
    area,
    milkQty = 1,
    curdQty = 0,
    frequency = 'daily',
  } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
  }

  // Check if user already exists
  const existingUser = store.data.users.find((u) => u.mobile === mobile);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'A user with this mobile number already exists. Please log in.' });
  }

  const userId = 'usr_' + Date.now();

  if (role === 'customer') {
    const nextCustNum = store.data.customers.length + 101;
    const customerId = `CUST-${nextCustNum}`;
    const assignedBoy = store.data.deliveryBoys.find((b) => b.assignedArea === area) || store.data.deliveryBoys[0];

    const newCustomer = {
      id: 'cust_' + Date.now(),
      customerId,
      name,
      mobile,
      whatsapp: mobile,
      address: address || 'Home Delivery Address',
      area: area || 'Andheri West',
      landmark: '',
      latitude: 19.12 + Math.random() * 0.04,
      longitude: 72.82 + Math.random() * 0.04,
      status: 'active',
      pauseFrom: null,
      pauseUntil: null,
      temporaryQty: null,
      deliveryPlan: {
        milkQty: Number(milkQty) || 1,
        milkUnit: 'L',
        curdQty: Number(curdQty) || 0,
        curdUnit: 'g',
        frequency: frequency || 'daily',
        deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        deliveryBoyId: assignedBoy ? assignedBoy.id : 'usr_boy_1',
        deliveryBoyName: assignedBoy ? assignedBoy.name : 'Rahul Sharma',
        startDate: new Date().toISOString().split('T')[0],
      },
      paymentInfo: {
        paymentType: 'credit',
        paymentCycle: 'monthly',
      },
      currentBalance: 0,
      notes: 'Registered via web portal',
      createdAt: new Date().toISOString(),
    };

    store.data.customers.push(newCustomer);
    store.addAudit('Customer Registered', name, `New customer registered online (${customerId})`, 'auth');
    store.save();

    return res.status(201).json({
      success: true,
      user: {
        id: newCustomer.id,
        name: newCustomer.name,
        mobile: newCustomer.mobile,
        role: 'customer',
        customerId: newCustomer.customerId,
        area: newCustomer.area,
      },
      token: `token_cust_${newCustomer.id}_${Date.now()}`,
    });
  }

  // Admin or Delivery Boy registration
  const newUser = {
    id: userId,
    name,
    mobile,
    password: password || '123456',
    role: role === 'delivery_boy' ? 'delivery_boy' : 'admin',
    status: 'active',
    assignedArea: area || (role === 'delivery_boy' ? 'Andheri West' : 'All Areas'),
  };

  store.data.users.push(newUser);

  if (role === 'delivery_boy') {
    store.data.deliveryBoys.push({
      id: userId,
      name,
      mobile,
      assignedArea: area || 'Andheri West',
      vehicleNumber: 'MH-02-ND-' + Math.floor(1000 + Math.random() * 9000),
      status: 'active',
      activeCustomersCount: 0,
      todayDeliveredCount: 0,
    });
  }

  store.addAudit('Staff Registered', name, `Registered as ${role}`, 'auth');
  store.save();

  return res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      mobile: newUser.mobile,
      role: newUser.role,
      assignedArea: newUser.assignedArea,
    },
    token: `token_${newUser.id}_${Date.now()}`,
  });
};

const getMe = (req, res) => {
  const user = store.data.users[0];
  return res.json({ success: true, user });
};

const getAllUsers = (req, res) => {
  return res.json({ success: true, users: store.data.users });
};

module.exports = { login, register, getMe, getAllUsers };
