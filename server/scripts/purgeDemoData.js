const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function purgeDemoData() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas for demo data purge...');

  const Customer = require('../models/Customer');
  const Delivery = require('../models/Delivery');
  const Payment = require('../models/Payment');
  const User = require('../models/User');

  const custRes = await Customer.deleteMany({});
  console.log(`🗑️ Deleted demo customers: ${custRes.deletedCount}`);

  const delRes = await Delivery.deleteMany({});
  console.log(`🗑️ Deleted demo deliveries: ${delRes.deletedCount}`);

  const payRes = await Payment.deleteMany({});
  console.log(`🗑️ Deleted demo payments: ${payRes.deletedCount}`);

  const userRes = await User.deleteMany({ role: { $ne: 'admin' } });
  console.log(`🗑️ Deleted non-admin demo users: ${userRes.deletedCount}`);

  const adminCount = await User.countDocuments({ role: 'admin' });
  console.log(`🛡️ Seeded admins preserved: ${adminCount}`);

  const Product = require('../models/Product');
  const prodCount = await Product.countDocuments();
  console.log(`🥛 Products preserved in catalog: ${prodCount}`);

  await mongoose.disconnect();
  console.log('🎉 MongoDB demo data purge complete!');
}

purgeDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Purge error:', err);
    process.exit(1);
  });
