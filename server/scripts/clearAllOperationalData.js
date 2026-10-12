const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function clearAllOperationalData() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🌿 Connected to MongoDB Atlas for data cleanup...');

  const Customer = require('../models/Customer');
  const Delivery = require('../models/Delivery');
  const Payment = require('../models/Payment');
  const User = require('../models/User');
  const DeliveryBoy = require('../models/DeliveryBoy');
  const Notification = require('../models/Notification');
  const AuditLog = require('../models/AuditLog');

  // 1. Delete all customers
  const delCust = await Customer.deleteMany({});
  console.log(`🗑️ Deleted customers: ${delCust.deletedCount}`);

  // 2. Delete all deliveries
  const delDeliv = await Delivery.deleteMany({});
  console.log(`🗑️ Deleted deliveries: ${delDeliv.deletedCount}`);

  // 3. Delete all payments
  const delPay = await Payment.deleteMany({});
  console.log(`🗑️ Deleted payments: ${delPay.deletedCount}`);

  // 4. Delete customer and user accounts, keeping only admin and delivery partner
  const delUsers = await User.deleteMany({ role: { $in: ['customer', 'user'] } });
  console.log(`🗑️ Deleted customer user accounts: ${delUsers.deletedCount}`);

  // 5. Delete notifications and audit logs
  const delNotif = await Notification.deleteMany({});
  console.log(`🗑️ Deleted notifications: ${delNotif.deletedCount}`);

  const delLogs = await AuditLog.deleteMany({});
  console.log(`🗑️ Deleted audit logs: ${delLogs.deletedCount}`);

  // 6. Reset delivery partner cash and drop stats
  await DeliveryBoy.updateMany(
    {},
    {
      $set: {
        todayCashCollected: 0,
        todayUpiCollected: 0,
        todayCompleted: 0,
        todayPending: 0,
      },
    }
  );
  console.log('🔄 Reset delivery partner counters to 0');

  const remainingUsers = await User.find({}).select('name role mobile').lean();
  console.log('🛡️ Preserved system accounts:', remainingUsers);

  const remainingBoys = await DeliveryBoy.find({}).select('name mobile assignedArea').lean();
  console.log('🚚 Preserved delivery partners:', remainingBoys);

  await mongoose.disconnect();
  console.log('✅ Clean state achieved: Both Admin and Driver consoles are completely fresh and empty!');
}

clearAllOperationalData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cleanup error:', err);
    process.exit(1);
  });
