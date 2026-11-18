const User = require('../models/User');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const DeliveryLocation = require('../models/DeliveryLocation');
const { generateToken } = require('../middleware/authMiddleware');
const { recordAudit } = require('../services/auditService');
const { hashPassword, verifyPassword } = require('../security/password');
const { sendCustomerCredentialsEmail } = require('../services/emailService');
const { verifyFirebaseIdToken } = require('../security/firebaseVerifier');

const escapeRegex = (text) => String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

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
        isOnline: (deliveryBoyDoc?.isOnline ?? userDriverDoc?.isOnline ?? true) === true,
        lastOnlineAt: deliveryBoyDoc?.lastOnlineAt || userDriverDoc?.lastOnlineAt || null,
        lastOfflineAt: deliveryBoyDoc?.lastOfflineAt || userDriverDoc?.lastOfflineAt || null,
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
        customerId: foundCustomer.customerId || '',
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

      // If this genericUser is a customer, try to find matching customerId if not already stored
      let linkedCustomerId = genericUser.customerId || '';
      if (!linkedCustomerId && (genericUser.role === 'customer' || genericUser.role === 'user')) {
        const linkedCust = await Customer.findOne({
          $or: [
            ...(genericUser.mobile ? [{ mobile: genericUser.mobile }] : []),
            ...(genericUser.email ? [{ email: genericUser.email }] : []),
          ],
        }).lean();
        if (linkedCust?.customerId) {
          linkedCustomerId = linkedCust.customerId;
        }
      }

      const genericPayload = {
        id: genericUser._id.toString(),
        name: genericUser.name,
        email: genericUser.email || '',
        mobile: genericUser.mobile,
        role: genericUser.role || 'customer',
        status: genericUser.status || 'active',
        customerId: linkedCustomerId,
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
      email,
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
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
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

    const emailLookup = { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') };
    const existingEmailUser = await User.findOne({ email: emailLookup });
    const existingEmailCustomer = await Customer.findOne({ email: emailLookup });
    if (existingEmailUser || existingEmailCustomer) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists. Please log in.' });
    }

    const rawArea = (typeof area === 'string' && area.trim()) ? area.trim() : 'Madhapur';
    const validLocation = await DeliveryLocation.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(rawArea)}$`, 'i') },
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
        email: cleanEmail,
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
        email: cleanEmail,
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

    let emailSent = false;
    try {
      const emailTimeout = new Promise((resolve) => setTimeout(() => resolve({ success: false, timeout: true }), 6000));
      const emailRes = await Promise.race([
        sendCustomerCredentialsEmail(newCustomer, password, { createdByRole: 'self' }),
        emailTimeout,
      ]);
      emailSent = emailRes?.success || false;
    } catch (emailErr) {
      console.error('Customer self-registration email note:', emailErr.message);
    }

    const userPayload = {
      id: newCustomer._id.toString(),
      name: newCustomer.name,
      email: newCustomer.email,
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
      emailSent,
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

    if (safeUser.role === 'delivery_boy' || req.user.role === 'delivery_boy') {
      const cleanMob = safeUser.mobile ? String(safeUser.mobile).replace(/[^0-9]/g, '').slice(-10) : '';
      const boyMatch = await DeliveryBoy.findOne({
        $or: [
          ...(String(safeUser.id).length === 24 ? [{ _id: safeUser.id }] : []),
          ...(safeUser.mobile ? [{ mobile: safeUser.mobile }] : []),
          ...(cleanMob ? [{ mobile: cleanMob }, { mobile: new RegExp(cleanMob + '$') }] : []),
          ...(safeUser.name ? [{ name: new RegExp(`^${safeUser.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
        ],
      }).lean();

      if (boyMatch) {
        safeUser.boyId = boyMatch._id.toString();
        safeUser.todayCashCollected = boyMatch.todayCashCollected || 0;
        safeUser.todayUpiCollected = boyMatch.todayUpiCollected || 0;
        const userTime = Math.max(
          safeUser.lastOnlineAt ? new Date(safeUser.lastOnlineAt).getTime() : 0,
          safeUser.lastOfflineAt ? new Date(safeUser.lastOfflineAt).getTime() : 0
        );
        const boyTime = Math.max(
          boyMatch.lastOnlineAt ? new Date(boyMatch.lastOnlineAt).getTime() : 0,
          boyMatch.lastOfflineAt ? new Date(boyMatch.lastOfflineAt).getTime() : 0
        );

        if (boyTime >= userTime) {
          safeUser.isOnline = boyMatch.isOnline === true;
          safeUser.lastOnlineAt = boyMatch.lastOnlineAt || null;
          safeUser.lastOfflineAt = boyMatch.lastOfflineAt || null;
          safeUser.dutyLogs = Array.isArray(boyMatch.dutyLogs) ? boyMatch.dutyLogs : (safeUser.dutyLogs || []);
        } else {
          safeUser.isOnline = safeUser.isOnline === true;
        }
      } else if (typeof safeUser.isOnline !== 'boolean') {
        safeUser.isOnline = false;
      }
    }

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

/**
 * Role-Based Google Sign-In
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const rawToken =
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      req.body?.idToken ||
      req.body?.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required for Google Sign-In.',
      });
    }

    // 1. Authoritatively verify Firebase ID token
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(rawToken);
    } catch (verErr) {
      return res.status(401).json({
        success: false,
        message: `Google authentication failed: ${verErr.message}`,
      });
    }

    const { uid: firebaseUid, email: googleEmail, name: googleName, picture: googlePicture } = decoded;
    const emailRegex = new RegExp(`^${escapeRegex(googleEmail)}$`, 'i');
    const requestedPortal = (req.body?.portal || req.query?.portal || '').toLowerCase();

    // 2. STRICT SECURITY: ADMIN accounts CANNOT use Google Sign-In
    const existingAdmin = await User.findOne({
      $or: [
        { email: emailRegex, role: 'admin' },
        { firebaseUid, role: 'admin' },
      ],
    }).lean();

    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Google Sign-In is not permitted for administrator accounts. Please use your secure admin password.',
      });
    }

    // 3. PARTNER / DELIVERY BOY Flow
    const isPartnerPortal = requestedPortal === 'partner' || requestedPortal === 'delivery';

    const [deliveryBoyDoc, userDriverDoc] = await Promise.all([
      DeliveryBoy.findOne({ $or: [{ email: emailRegex }, { firebaseUid }] }),
      User.findOne({ $or: [{ email: emailRegex }, { firebaseUid }], role: 'delivery_boy' }),
    ]);

    const partnerRecord = deliveryBoyDoc || userDriverDoc;

    if (isPartnerPortal) {
      if (!partnerRecord) {
        // Check if account exists as a customer
        const isCustomerAccount = await Customer.findOne({ $or: [{ email: emailRegex }, { firebaseUid }] });
        if (isCustomerAccount) {
          return res.status(403).json({
            success: false,
            message: 'This Google account is registered as a customer, not an approved delivery partner. Please contact the administrator.',
          });
        }

        // DO NOT CREATE PARTNER AUTOMATICALLY
        return res.status(403).json({
          success: false,
          message: 'Your partner account has not been created or approved yet. Please contact the administrator.',
        });
      }

      // Partner exists - enforce active status
      const partnerStatus = (deliveryBoyDoc?.status || userDriverDoc?.status || 'active').toLowerCase();
      if (partnerStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Delivery partner account "${partnerRecord.name}" is currently marked as INACTIVE. Please contact the administrator.`,
        });
      }

      // Enforce email match: partner registered email must match Google email
      if (partnerRecord.email && partnerRecord.email.trim().toLowerCase() !== googleEmail.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Please sign in using the Google account associated with your partner account (${partnerRecord.email}).`,
        });
      }

      // Link firebaseUid if not set
      const linkUpdates = [];
      if (deliveryBoyDoc && (!deliveryBoyDoc.firebaseUid || deliveryBoyDoc.firebaseUid !== firebaseUid)) {
        deliveryBoyDoc.firebaseUid = firebaseUid;
        deliveryBoyDoc.authProvider = 'google';
        linkUpdates.push(deliveryBoyDoc.save());
      }
      if (userDriverDoc && (!userDriverDoc.firebaseUid || userDriverDoc.firebaseUid !== firebaseUid)) {
        userDriverDoc.firebaseUid = firebaseUid;
        userDriverDoc.authProvider = 'google';
        linkUpdates.push(userDriverDoc.save());
      }
      await Promise.all(linkUpdates);

      const partnerPayload = {
        id: partnerRecord._id.toString(),
        boyId: partnerRecord._id.toString(),
        name: partnerRecord.name,
        email: partnerRecord.email || googleEmail,
        mobile: partnerRecord.mobile,
        role: 'delivery_boy',
        status: partnerStatus,
        assignedArea: partnerRecord.assignedArea || 'Andheri West',
        vehicleNumber: partnerRecord.vehicleNumber || '',
        isOnline: partnerRecord.isOnline ?? true,
        avatar: googlePicture || partnerRecord.avatar || '',
      };
      const token = generateToken(partnerPayload);

      await recordAudit('Partner Google Login', partnerRecord.name, `Google Sign-In successful (${googleEmail})`, 'partner');

      return res.json({
        success: true,
        user: partnerPayload,
        token,
      });
    }

    // 4. If partner logs in via general login, authenticate them as partner
    if (partnerRecord) {
      const partnerStatus = (deliveryBoyDoc?.status || userDriverDoc?.status || 'active').toLowerCase();
      if (partnerStatus !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Delivery partner account is currently marked as INACTIVE. Please contact the administrator.',
        });
      }
      const partnerPayload = {
        id: partnerRecord._id.toString(),
        boyId: partnerRecord._id.toString(),
        name: partnerRecord.name,
        email: partnerRecord.email || googleEmail,
        mobile: partnerRecord.mobile,
        role: 'delivery_boy',
        status: partnerStatus,
        assignedArea: partnerRecord.assignedArea || 'Andheri West',
        vehicleNumber: partnerRecord.vehicleNumber || '',
        isOnline: partnerRecord.isOnline ?? true,
        avatar: googlePicture || partnerRecord.avatar || '',
      };
      const token = generateToken(partnerPayload);
      return res.json({ success: true, user: partnerPayload, token });
    }

    // 5. USER / CUSTOMER Flow
    const rawMobileInput = (req.body?.mobile || req.body?.identifier || '').toString().trim();
    const cleanDigits = rawMobileInput.replace(/\D/g, '');
    const mobileDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    const inputName = (req.body?.name || '').toString().trim();
    const displayName = inputName || (googleName || '').trim() || 'Valued Customer';

    const inputPassword = (req.body?.password || '').toString().trim();
    let passwordHash = '';
    if (inputPassword) {
      passwordHash = await hashPassword(inputPassword);
    }

    let foundCustomer = await Customer.findOne({
      $or: [{ email: emailRegex }, { firebaseUid }],
    });

    let foundUser = await User.findOne({
      $or: [{ email: emailRegex }, { firebaseUid }],
      role: { $in: ['customer', 'user'] },
    });

    // If not found by email/uid but client provided a phone number, check by mobile
    if (!foundCustomer && !foundUser && mobileDigits) {
      foundCustomer = await Customer.findOne({ mobile: new RegExp(mobileDigits + '$') });
      foundUser = await User.findOne({ mobile: new RegExp(mobileDigits + '$'), role: { $in: ['customer', 'user'] } });
    }

    if (foundCustomer || foundUser) {
      const activeDoc = foundCustomer || foundUser;
      const status = (activeDoc.status || 'active').toLowerCase();
      if (status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your customer account is currently inactive. Please contact customer support.',
        });
      }

      // Link firebaseUid, update name, real mobile and password if provided
      if (foundCustomer) {
        if (!foundCustomer.firebaseUid || foundCustomer.firebaseUid !== firebaseUid) {
          foundCustomer.firebaseUid = firebaseUid;
          foundCustomer.authProvider = 'google';
        }
        if (!foundCustomer.email) foundCustomer.email = googleEmail;
        if (inputName) foundCustomer.name = inputName;
        if (mobileDigits && (!foundCustomer.mobile || foundCustomer.mobile.startsWith('temp_'))) {
          foundCustomer.mobile = mobileDigits;
        }
        await foundCustomer.save();
      }
      if (foundUser) {
        if (!foundUser.firebaseUid || foundUser.firebaseUid !== firebaseUid) {
          foundUser.firebaseUid = firebaseUid;
          foundUser.authProvider = 'google';
        }
        if (!foundUser.email) foundUser.email = googleEmail;
        if (inputName) foundUser.name = inputName;
        if (googlePicture && !foundUser.avatar) foundUser.avatar = googlePicture;
        if (mobileDigits && (!foundUser.mobile || foundUser.mobile.startsWith('temp_'))) {
          foundUser.mobile = mobileDigits;
        }
        if (passwordHash) {
          foundUser.password = passwordHash;
        }
        await foundUser.save();
      }

      const custPayload = {
        id: (foundCustomer?._id || foundUser?._id).toString(),
        name: foundCustomer?.name || foundUser?.name || displayName,
        email: googleEmail,
        mobile: foundCustomer?.mobile || foundUser?.mobile || mobileDigits || '',
        role: 'customer',
        status: 'active',
        customerId: foundCustomer?.customerId || foundUser?.customerId || '',
        area: foundCustomer?.area || foundUser?.assignedArea || 'Madhapur',
        avatar: googlePicture || foundUser?.avatar || '',
      };
      const token = generateToken(custPayload);

      return res.json({
        success: true,
        user: custPayload,
        token,
      });
    }

    // 6. NEW USER: Require real mobile number, never generate fake random numbers
    if (!mobileDigits) {
      return res.status(200).json({
        success: true,
        requiresProfileCompletion: true,
        requiresMobile: true,
        email: googleEmail,
        name: displayName,
        firebaseUid,
        message: 'Please complete your profile with your phone number and password.',
      });
    }

    let newCustId = '';
    for (let attempts = 0; attempts < 5; attempts++) {
      const candidate = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = await Customer.findOne({ customerId: candidate });
      if (!exists) {
        newCustId = candidate;
        break;
      }
    }
    if (!newCustId) newCustId = `CUST-${Date.now().toString().slice(-4)}`;

    const realMobile = mobileDigits;

    // Check if real mobile is already in User collection
    const existingUserWithPhone = await User.findOne({ mobile: realMobile });
    if (existingUserWithPhone) {
      existingUserWithPhone.firebaseUid = firebaseUid;
      existingUserWithPhone.authProvider = 'google';
      if (!existingUserWithPhone.email) existingUserWithPhone.email = googleEmail;
      if (inputName) existingUserWithPhone.name = inputName;
      if (passwordHash) existingUserWithPhone.password = passwordHash;
      await existingUserWithPhone.save();

      const existingCustWithPhone = await Customer.findOne({ mobile: realMobile });
      if (existingCustWithPhone) {
        existingCustWithPhone.firebaseUid = firebaseUid;
        existingCustWithPhone.authProvider = 'google';
        if (!existingCustWithPhone.email) existingCustWithPhone.email = googleEmail;
        if (inputName) existingCustWithPhone.name = inputName;
        await existingCustWithPhone.save();
      }

      const custPayload = {
        id: (existingCustWithPhone?._id || existingUserWithPhone._id).toString(),
        name: existingCustWithPhone?.name || existingUserWithPhone.name || displayName,
        email: googleEmail,
        mobile: realMobile,
        role: 'customer',
        status: 'active',
        customerId: existingCustWithPhone?.customerId || existingUserWithPhone.customerId || '',
        area: existingCustWithPhone?.area || existingUserWithPhone.assignedArea || 'Madhapur',
        avatar: googlePicture || existingUserWithPhone.avatar || '',
      };
      const token = generateToken(custPayload);
      return res.json({ success: true, user: custPayload, token });
    }

    const newCustomer = await Customer.create({
      customerId: newCustId,
      name: displayName,
      email: googleEmail,
      mobile: realMobile,
      address: 'Doorstep Address, Hyderabad',
      area: 'Madhapur',
      status: 'active',
      firebaseUid,
      authProvider: 'google',
    });

    await User.create({
      name: displayName,
      email: googleEmail,
      mobile: realMobile,
      password: passwordHash || '',
      role: 'customer',
      status: 'active',
      customerId: newCustId,
      firebaseUid,
      authProvider: 'google',
      avatar: googlePicture || '',
    });

    const userPayload = {
      id: newCustomer._id.toString(),
      name: displayName,
      email: googleEmail,
      mobile: realMobile,
      role: 'customer',
      status: 'active',
      customerId: newCustId,
      area: 'Madhapur',
      avatar: googlePicture || '',
    };
    const token = generateToken(userPayload);

    await recordAudit('Google Account Created', displayName, `New customer created via Google (${googleEmail}, Mobile: ${realMobile})`, 'customer');

    return res.status(201).json({
      success: true,
      user: userPayload,
      token,
      isNewUser: true,
    });
  } catch (err) {
    console.error('Google Sign-In failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete Google Sign-In. Please try again.',
    });
  }
};

module.exports = { login, register, googleLogin, getDeliveryAreas, getMe, verifyTokenStatus, getAllUsers };
