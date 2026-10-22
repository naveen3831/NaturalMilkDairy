const User = require('../models/User');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const DeliveryLocation = require('../models/DeliveryLocation');
const { generateToken } = require('../middleware/authMiddleware');
const { recordAudit } = require('../services/auditService');
const { hashPassword, verifyPassword } = require('../security/password');

const verifyStoredPassword = async (password, records) => {
  let valid = false;
  let needsRehash = false;
  for (const { model, document } of records) {
    if (!document?.password) continue;
    const result = await verifyPassword(password, document.password);
    if (result.valid) {
      valid = true;
      needsRehash = needsRehash || result.needsRehash;
    }
  }
  if (valid && needsRehash) {
    const passwordHash = await hashPassword(password);
    await Promise.all(records
      .filter(({ document }) => document?._id)
      .map(({ model, document }) =>
        model.updateOne({ _id: document._id }, { $set: { password: passwordHash } })
      ));
  }
  return valid;
};

const login = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Enter your registered email/mobile number and password.' });
    }
    const { mobile, email, identifier: rawIdentifier, username, password } = req.body;
    const rawValue = rawIdentifier || username || mobile || email || '';
    if (typeof rawValue !== 'string' || rawValue.length > 254 || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Enter a valid email/mobile number and password.' });
    }

    const identifier = rawValue.trim();
    const cleanId = identifier.toLowerCase();
    let cleanPhone = identifier.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
    const inputPassword = password;

    if (!identifier || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email/mobile number and password.',
      });
    }

    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const emailRegex = new RegExp(`^${escapeRegex(cleanId)}$`, 'i');

    // 1. Check if Admin
    const foundAdmin = await User.findOne({
      $or: [
        { email: emailRegex, role: 'admin' },
        { mobile: identifier, role: 'admin' },
        ...(cleanPhone.length === 10 ? [{ mobile: cleanPhone, role: 'admin' }] : []),
      ],
    });

    if (foundAdmin) {
      if (foundAdmin.status && foundAdmin.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Your account is inactive. Contact an administrator.' });
      }
      if (await verifyStoredPassword(inputPassword, [{ model: User, document: foundAdmin }])) {
        const userPayload = {
          id: foundAdmin._id.toString(),
          name: foundAdmin.name || 'Dairy Owner (Admin)',
          email: foundAdmin.email || 'admin@gmail.com',
          mobile: foundAdmin.mobile || 'admin@gmail.com',
          role: 'admin',
          status: foundAdmin.status || 'active',
          assignedArea: 'All Dairy Routes',
        };
        const token = generateToken(userPayload);
        return res.json({
          success: true,
          user: userPayload,
          token,
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/mobile number or password.',
        });
      }
    }

    // 2. Check if Delivery Partner (look up in DeliveryBoy collection and User collection)
    const boyMatches = await DeliveryBoy.find({
      $or: [
        { email: emailRegex },
        { mobile: identifier },
        ...(cleanPhone.length >= 10 ? [{ mobile: cleanPhone }] : []),
      ],
    }).lean();

    const userDriverMatches = await User.find({
      $or: [
        { email: emailRegex },
        { mobile: identifier },
        ...(cleanPhone.length >= 10 ? [{ mobile: cleanPhone }] : []),
      ],
      role: 'delivery_boy',
    }).lean();

    const deliveryBoyDoc = boyMatches[0] || null;
    const userDriverDoc = userDriverMatches[0] || null;

    if (deliveryBoyDoc || userDriverDoc) {
      const driver = deliveryBoyDoc || userDriverDoc;
      const driverStatus = (deliveryBoyDoc?.status || userDriverDoc?.status || 'active').toLowerCase();

      // STRICT AVAILABILITY CHECK: Driver must be active / available to access dashboard
      if (driverStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Delivery partner account "${driver.name}" is currently marked as INACTIVE / UNAVAILABLE. Please contact the dairy administrator to activate your account.`,
        });
      }

      // Check portal password
      const isValidPass = await verifyStoredPassword(inputPassword, [
        { model: User, document: userDriverDoc },
        { model: DeliveryBoy, document: deliveryBoyDoc },
      ]);

      if (!isValidPass) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/mobile number or password.',
        });
      }

      const partnerPayload = {
        id: (deliveryBoyDoc?._id || userDriverDoc?._id).toString(),
        boyId: (deliveryBoyDoc?._id || userDriverDoc?._id).toString(),
        name: driver.name,
        email: driver.email || '',
        mobile: driver.mobile,
        role: 'delivery_boy',
        status: driverStatus,
        assignedArea: driver.assignedArea || 'Andheri West',
        vehicleNumber: driver.vehicleNumber || '',
      };
      const token = generateToken(partnerPayload);

      return res.json({
        success: true,
        user: partnerPayload,
        token,
      });
    }

    // 3. Check if Customer
    const foundCustomer = await Customer.findOne({
      $or: [
        { email: emailRegex },
        { mobile: identifier },
        ...(cleanPhone.length >= 10 ? [{ mobile: cleanPhone }] : []),
        { customerId: identifier.toUpperCase() },
      ],
    }).lean();

    if (foundCustomer) {
      const customerStatus = (foundCustomer.status || 'active').toLowerCase();
      if (customerStatus === 'inactive' && foundCustomer.subscription?.status !== 'pending_payment') {
        return res.status(403).json({
          success: false,
          message: 'Your customer account is currently inactive. Please contact the dairy administrator.',
        });
      }

      const customerUser = await User.findOne({
        mobile: foundCustomer.mobile,
        role: { $in: ['customer', 'user'] },
      }).lean();
      const isValidPass = await verifyStoredPassword(inputPassword, [
        { model: User, document: customerUser },
        { model: Customer, document: foundCustomer },
      ]);
      if (!isValidPass) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/mobile number or password.',
        });
      }

      const custPayload = {
        id: foundCustomer._id.toString(),
        name: foundCustomer.name,
        email: foundCustomer.email || '',
        mobile: foundCustomer.mobile,
        role: 'customer',
        status: customerStatus,
        customerId: foundCustomer.customerId || 'CUST-101',
        area: foundCustomer.area || '',
      };
      const token = generateToken(custPayload);

      return res.json({
        success: true,
        user: custPayload,
        token,
      });
    }

    // 4. Also check general User collection
    const genericUser = await User.findOne({
      $or: [
        { email: emailRegex },
        { mobile: identifier },
        ...(cleanPhone.length === 10 ? [{ mobile: cleanPhone }] : []),
      ],
    }).lean();

    if (genericUser) {
      if (genericUser.status && genericUser.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your account is currently inactive. Please contact support.',
        });
      }

      if (!(await verifyStoredPassword(inputPassword, [{ model: User, document: genericUser }]))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email/mobile number or password.',
        });
      }

      const genericPayload = {
        id: genericUser._id.toString(),
        name: genericUser.name,
        email: genericUser.email || '',
        mobile: genericUser.mobile,
        role: genericUser.role || 'customer',
        status: genericUser.status || 'active',
        assignedArea: genericUser.assignedArea || 'All Areas',
      };
      const token = generateToken(genericPayload);
      return res.json({
        success: true,
        user: genericPayload,
        token,
      });
    }

    // 5. Account not found
    return res.status(401).json({
      success: false,
      message: 'Invalid email/mobile number or password.',
    });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
};

const DEFAULT_DELIVERY_AREAS = [
  'Madhapur',
  'Hitec City',
  'Gachibowli',
  'Kondapur',
  'Jubilee Hills',
  'Banjara Hills',
  'Kukatpally',
  'Manikonda',
  'Financial District',
  'Andheri West',
  'Bandra',
  'Juhu',
];

const register = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Registration details must be an object.' });
    }
    const {
      name,
      mobile,
      password,
      role = 'customer',
      address,
      area,
    } = req.body;

    if (role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Public registration is only available for customer accounts.' });
    }

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters.' });
    }
    if (typeof mobile !== 'string' || !/^(?:\+?91[- ]?)?[6-9]\d{9}$/.test(mobile.trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
    }
    if (typeof address !== 'string' || address.trim().length < 4 || address.trim().length > 250) {
      return res.status(400).json({ success: false, message: 'Address must be between 4 and 250 characters.' });
    }
    if (area !== undefined && (typeof area !== 'string' || area.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Enter a valid delivery area.' });
    }

    const cleanMobile = mobile.trim().replace(/[ -]/g, '').replace(/^\+?91/, '');
    const cleanName = name.trim();
    const existingUser = await User.findOne({ mobile: cleanMobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this mobile number already exists. Please log in.' });
    }

    const existingCustomer = await Customer.findOne({ mobile: cleanMobile });
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'A customer with this mobile number already exists. Please log in.' });
    }

    const rawArea = (typeof area === 'string' && area.trim()) ? area.trim() : 'Madhapur';
    const escapedArea = rawArea.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const validLocation = await DeliveryLocation.findOne({
      name: { $regex: new RegExp(`^${escapedArea}$`, 'i') },
      isActive: true,
    });

    if (!validLocation) {
      return res.status(400).json({
        success: false,
        message: `Delivery is currently not available in "${rawArea}". Please choose an active location from our delivery zones.`,
      });
    }

    const selectedArea = validLocation.name;
    const cleanAddress = address.trim();

    const custCount = await Customer.countDocuments();
    const customerId = `CUST-${custCount + 101}`;

    const newCustomer = await Customer.create({
        customerId,
        name: cleanName,
        mobile: cleanMobile,
        whatsapp: cleanMobile,
        address: cleanAddress,
        area: selectedArea,
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
          startDate: null,
        },
        paymentInfo: {
          paymentType: 'prepaid',
          paymentCycle: 'monthly',
        },
        currentBalance: 0,
        notes: 'Registered via web portal',
        createdAt: new Date(),
    });

    try {
      await User.create({
        name: cleanName,
        mobile: cleanMobile,
        password: await hashPassword(password),
        role: 'customer',
        status: 'active',
        assignedArea: selectedArea,
        address: cleanAddress,
      });
    } catch (err) {
      await Customer.deleteOne({ _id: newCustomer._id });
      throw err;
    }

    await recordAudit('Customer Registered', cleanName, `New customer registered online (${customerId})`, 'auth');

    const userPayload = {
      id: newCustomer._id.toString(),
      name: newCustomer.name,
      mobile: newCustomer.mobile,
      role: 'customer',
      status: 'inactive',
      customerId: newCustomer.customerId,
      area: newCustomer.area,
      address: newCustomer.address,
    };
    return res.status(201).json({
      success: true,
      user: userPayload,
      token: generateToken(userPayload),
    });
  } catch (err) {
    console.error('Registration failed:', err);
    return res.status(500).json({ success: false, message: 'Unable to complete registration right now.' });
  }
};

const getDeliveryAreas = async (req, res) => {
  try {
    const locations = await DeliveryLocation.find({ isActive: true }).sort({ name: 1 }).lean();
    if (locations && locations.length > 0) {
      const areas = locations.map((l) => l.name);
      return res.json({
        success: true,
        areas,
        locations: locations.map((l) => ({ ...l, id: l._id.toString() })),
      });
    }

    // Fallback if collection was empty
    return res.json({ success: true, areas: DEFAULT_DELIVERY_AREAS });
  } catch (err) {
    return res.json({ success: true, areas: DEFAULT_DELIVERY_AREAS });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session found.',
      });
    }

    let userDoc = null;
    const userId = req.user.id;

    if (req.user.role === 'admin') {
      userDoc = await User.findById(userId).lean();
    } else if (req.user.role === 'delivery_boy') {
      userDoc = (await DeliveryBoy.findById(userId).lean()) || (await User.findById(userId).lean());
    } else {
      userDoc = (await Customer.findById(userId).lean()) || (await User.findById(userId).lean());
    }

    if (!userDoc) {
      userDoc =
        (await User.findById(userId).lean()) ||
        (await Customer.findById(userId).lean()) ||
        (await DeliveryBoy.findById(userId).lean());
    }

    if (!userDoc) {
      return res.status(401).json({ success: false, message: 'Account no longer exists. Please sign in again.' });
    }
    if (userDoc.status === 'inactive' && ['admin', 'delivery_boy', 'user'].includes(req.user.role)) {
      return res.status(401).json({ success: false, message: 'Account is inactive. Please contact an administrator.' });
    }

    // Strip password for security
    const { password, ...safeUser } = userDoc;
    safeUser.id = userDoc._id ? userDoc._id.toString() : userId;
    safeUser.role = userDoc.role || req.user.role;

    return res.json({ success: true, user: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const verifyTokenStatus = async (req, res) => {
  return res.json({
    success: true,
    valid: true,
    user: req.user,
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).lean();
    return res.json({
      success: true,
      users: users.map((u) => {
        const { password, ...safe } = u;
        return {
          ...safe,
          id: u._id.toString(),
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { login, register, getDeliveryAreas, getMe, verifyTokenStatus, getAllUsers };
