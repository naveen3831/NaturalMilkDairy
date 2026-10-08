const User = require('../models/User');
const DeliveryBoy = require('../models/DeliveryBoy');
const Delivery = require('../models/Delivery');
const { recordAudit } = require('../services/auditService');
const { formatDate } = require('../services/deliveryService');

const getDeliveryBoys = async (req, res) => {
  try {
    const today = formatDate();
    const [boys, deliveries, users] = await Promise.all([
      DeliveryBoy.find({}).lean(),
      Delivery.find({ deliveryDate: today }).lean(),
      User.find({ role: 'delivery_boy' }).lean(),
    ]);

    // Also include any users with role delivery_boy that might not be in DeliveryBoy model yet
    const driverList = [...boys];
    users.forEach((u) => {
      const exists = driverList.some((b) => b.mobile === u.mobile);
      if (!exists) {
        driverList.push({
          _id: u._id,
          name: u.name,
          mobile: u.mobile,
          email: u.email || '',
          assignedArea: u.assignedArea || 'Andheri West',
          vehicleNumber: '',
          status: u.status || 'active',
          todayCashCollected: 0,
          todayUpiCollected: 0,
        });
      }
    });

    const responseBoys = driverList.map((boy) => {
      const boyDeliveries = deliveries.filter(
        (d) =>
          (d.deliveryBoyId && d.deliveryBoyId === boy._id.toString()) ||
          (d.deliveryBoyName && d.deliveryBoyName.toLowerCase() === boy.name.toLowerCase())
      );

      const completed = boyDeliveries.filter((d) => d.status === 'delivered').length;
      const pending = boyDeliveries.filter((d) => d.status === 'pending').length;
      const notDelivered = boyDeliveries.filter((d) => d.status === 'not_delivered').length;
      const creditAmount = boyDeliveries
        .filter((d) => d.status === 'delivered' && d.paymentMethod === 'credit')
        .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

      const userMatch = users.find((u) => u.mobile === boy.mobile || (boy.email && u.email === boy.email));

      return {
        id: boy._id.toString(),
        name: boy.name,
        email: boy.email || (userMatch ? userMatch.email : ''),
        mobile: boy.mobile,
        assignedArea: boy.assignedArea || 'Andheri West',
        vehicleNumber: boy.vehicleNumber || '',
        status: boy.status || 'active',
        password: boy.password || (userMatch ? userMatch.password : ''),
        todayCashCollected: boy.todayCashCollected || 0,
        todayUpiCollected: boy.todayUpiCollected || 0,
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

    return res.json({ success: true, deliveryBoys: responseBoys });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const addDeliveryBoy = async (req, res) => {
  try {
    const { name, email, mobile, assignedArea, vehicleNumber, password, status, actor } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    const driverPass = password && password.trim() ? password.trim() : 'Driver@123';
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanName = name.trim();
    const area = assignedArea || 'Andheri West';
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // 0. Check if phone number or email already exists
    const existingByMobile =
      (await DeliveryBoy.findOne({ mobile: cleanMobile })) ||
      (await User.findOne({ mobile: cleanMobile }));

    let existingByEmail = null;
    if (cleanEmail) {
      const emailRegex = new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i');
      existingByEmail =
        (await DeliveryBoy.findOne({ email: emailRegex })) ||
        (await User.findOne({ email: emailRegex }));
    }

    if (existingByMobile && existingByEmail) {
      return res.status(400).json({
        success: false,
        message: `Both phone number (${cleanMobile}) and email (${cleanEmail}) are already registered with partner "${existingByMobile.name || existingByEmail.name}". Please change both the phone number and email.`,
        field: 'both',
        existingPartnerName: existingByMobile.name || existingByEmail.name,
      });
    }

    if (existingByMobile) {
      return res.status(400).json({
        success: false,
        message: `Phone number (${cleanMobile}) is already registered with partner "${existingByMobile.name}". Please change the phone number.`,
        field: 'mobile',
        existingPartnerName: existingByMobile.name,
      });
    }

    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        message: `Email address (${cleanEmail}) is already registered with partner "${existingByEmail.name}". Please change the email address.`,
        field: 'email',
        existingPartnerName: existingByEmail.name,
      });
    }

    // 1. Save in DeliveryBoy collection
    const newBoy = await DeliveryBoy.create({
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      password: driverPass,
      assignedArea: area,
      vehicleNumber: (vehicleNumber || '').trim(),
      status: status || 'active',
      todayCashCollected: 0,
      todayUpiCollected: 0,
      createdAt: new Date(),
    });

    // 2. Save in User collection for portal login
    await User.findOneAndUpdate(
      { mobile: cleanMobile },
      {
        $set: {
          name: cleanName,
          email: cleanEmail,
          mobile: cleanMobile,
          password: driverPass,
          role: 'delivery_boy',
          assignedArea: area,
          status: status || 'active',
        },
      },
      { upsert: true, new: true }
    );

    await recordAudit(
      'Delivery Partner Registered',
      actor || 'Admin',
      `Added ${cleanName} (${cleanMobile}) for ${area}`,
      'system'
    );

    // Send partner credentials email
    let emailSent = false;
    if (cleanEmail) {
      const { sendPartnerCredentialsEmail } = require('../services/emailService');
      try {
        const emailRes = await sendPartnerCredentialsEmail(
          { name: cleanName, email: cleanEmail, mobile: cleanMobile, assignedArea: area },
          driverPass
        );
        emailSent = emailRes?.success || false;
      } catch (e) {
        console.error('Partner credentials email error:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      deliveryBoy: {
        id: newBoy._id.toString(),
        name: newBoy.name,
        email: cleanEmail,
        mobile: newBoy.mobile,
        assignedArea: newBoy.assignedArea,
        vehicleNumber: newBoy.vehicleNumber,
        status: newBoy.status,
      },
      temporaryPassword: driverPass,
      emailSent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, assignedArea, vehicleNumber, password, status, resendEmail, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { mobile: id };
    const boy = await DeliveryBoy.findOne(query);

    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const oldMobile = boy.mobile;

    // Check duplicate mobile if changed
    if (mobile && mobile.trim() !== boy.mobile) {
      const cleanNewMobile = mobile.trim();
      const dupMobile =
        (await DeliveryBoy.findOne({ mobile: cleanNewMobile, _id: { $ne: boy._id } })) ||
        (await User.findOne({ mobile: cleanNewMobile, _id: { $ne: boy._id } }));
      if (dupMobile) {
        return res.status(400).json({
          success: false,
          message: `Phone number (${cleanNewMobile}) is already registered with partner "${dupMobile.name}". Please change the phone number.`,
          field: 'mobile',
          existingPartnerName: dupMobile.name,
        });
      }
    }

    // Check duplicate email if changed
    if (email && email.trim().toLowerCase() !== (boy.email || '').toLowerCase()) {
      const cleanNewEmail = email.trim().toLowerCase();
      const emailRegex = new RegExp(`^${escapeRegex(cleanNewEmail)}$`, 'i');
      const dupEmail =
        (await DeliveryBoy.findOne({ email: emailRegex, _id: { $ne: boy._id } })) ||
        (await User.findOne({ email: emailRegex, _id: { $ne: boy._id } }));
      if (dupEmail) {
        return res.status(400).json({
          success: false,
          message: `Email address (${cleanNewEmail}) is already registered with partner "${dupEmail.name}". Please change the email address.`,
          field: 'email',
          existingPartnerName: dupEmail.name,
        });
      }
    }

    if (name !== undefined) boy.name = name.trim();
    if (email !== undefined) boy.email = email.trim().toLowerCase();
    if (mobile !== undefined) boy.mobile = mobile.trim();
    if (assignedArea !== undefined) boy.assignedArea = assignedArea.trim();
    if (vehicleNumber !== undefined) boy.vehicleNumber = vehicleNumber.trim();
    if (status !== undefined) boy.status = status;
    if (password && password.trim()) {
      boy.password = password.trim();
    }
    await boy.save();

    // Update matching User document
    const userUpdate = {
      name: boy.name,
      mobile: boy.mobile,
      email: boy.email || '',
      assignedArea: boy.assignedArea,
      status: boy.status,
      role: 'delivery_boy',
    };
    if (password && password.trim()) userUpdate.password = password.trim();

    let user = await User.findOneAndUpdate(
      { $or: [{ mobile: oldMobile }, { mobile: boy.mobile }] },
      { $set: userUpdate },
      { new: true }
    );
    if (!user) {
      user = await User.create({
        ...userUpdate,
        password: boy.password || 'Driver@123',
      });
    }

    await recordAudit(
      'Delivery Partner Updated',
      actor || 'Admin',
      `Updated details for partner ${boy.name} (${boy.mobile})`,
      'system'
    );

    let emailSent = false;
    const targetEmail = email ? email.trim().toLowerCase() : (user ? user.email : '');
    if (resendEmail && targetEmail) {
      const { sendPartnerCredentialsEmail } = require('../services/emailService');
      try {
        const emailRes = await sendPartnerCredentialsEmail(
          { name: boy.name, email: targetEmail, mobile: boy.mobile, assignedArea: boy.assignedArea },
          user?.password || password || 'Driver@123'
        );
        emailSent = emailRes?.success || false;
      } catch (e) {
        console.error('Partner update credentials email error:', e.message);
      }
    }

    return res.json({
      success: true,
      message: `Delivery partner ${boy.name} updated successfully`,
      deliveryBoy: {
        id: boy._id.toString(),
        name: boy.name,
        email: targetEmail,
        mobile: boy.mobile,
        assignedArea: boy.assignedArea,
        vehicleNumber: boy.vehicleNumber,
        status: boy.status,
      },
      emailSent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor } = req.body || {};

    const query = id.length === 24 ? { _id: id } : { mobile: id };
    const boy = await DeliveryBoy.findOneAndDelete(query);

    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    // Delete matching User
    await User.deleteOne({
      $or: [{ mobile: boy.mobile }, { name: boy.name }],
    });

    await recordAudit(
      'Delivery Partner Removed',
      actor || 'Admin',
      `Removed delivery partner ${boy.name} (${boy.mobile})`,
      'system'
    );

    return res.json({
      success: true,
      message: `Delivery partner ${boy.name} removed successfully`,
      id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const reconcileCash = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { mobile: id };
    const boy = await DeliveryBoy.findOne(query);

    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery boy not found' });
    }

    const total = (boy.todayCashCollected || 0) + (boy.todayUpiCollected || 0);

    await recordAudit(
      'Collection Reconciled',
      actor || 'Admin',
      `Verified daily collection of ₹${total} (Cash: ₹${boy.todayCashCollected}, UPI: ₹${boy.todayUpiCollected}) for ${boy.name}${notes ? `. Notes: ${notes}` : ''}`,
      'payment'
    );

    boy.todayCashCollected = 0;
    boy.todayUpiCollected = 0;
    await boy.save();

    return res.json({
      success: true,
      message: `Collection of ₹${total} reconciled successfully for ${boy.name}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const sendDeliveryBoyCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { mobile: id };
    const boy = await DeliveryBoy.findOne(query);

    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const user = await User.findOne({ mobile: boy.mobile });
    const targetEmail = boy.email || user?.email;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'No email address registered for this delivery partner' });
    }

    const password = user?.password || 'Driver@123';
    const { sendPartnerCredentialsEmail } = require('../services/emailService');
    const emailRes = await sendPartnerCredentialsEmail(
      {
        name: boy.name,
        email: targetEmail,
        mobile: boy.mobile,
        assignedArea: boy.assignedArea,
        vehicleNumber: boy.vehicleNumber,
      },
      password
    );

    if (!emailRes?.success) {
      return res.status(500).json({
        success: false,
        message: emailRes?.error || 'Failed to dispatch email via SMTP',
      });
    }

    await recordAudit(
      'Credentials Dispatched',
      req.body?.actor || 'Admin',
      `Emailed login credentials for ${boy.name} to ${targetEmail}`,
      'system'
    );

    return res.json({
      success: true,
      message: `Credentials successfully emailed to ${targetEmail}`,
      messageId: emailRes.messageId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDeliveryBoys,
  addDeliveryBoy,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  reconcileCash,
  sendDeliveryBoyCredentials,
};
