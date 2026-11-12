require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const User = require('../models/User');
const { isCloudinaryUrl, ensureCloudinaryUrl, cloudinary } = require('../config/cloudinary');

const PUBLIC_DIR = path.join(__dirname, '../../client/public');
const LEGACY_UPLOADS_DIR = path.join(__dirname, '../uploads');

async function migrateField(doc, field, folder, report) {
  const val = typeof doc[field] === 'string' ? doc[field].trim() : '';
  if (!val) return false;
  if (isCloudinaryUrl(val)) {
    const normalized = val.replace(/^http:\/\//i, 'https://');
    if (normalized !== doc[field]) {
      doc[field] = normalized;
      return true;
    }
    return false;
  }

  try {
    const cloudUrl = await ensureCloudinaryUrl(val, { folder, timeoutMs: 45000 });
    doc[field] = cloudUrl;
    report.migrated++;
    return true;
  } catch (err) {
    report.failed.push({ id: doc._id?.toString(), field, sample: val.slice(0, 80), error: err.message });
    return false;
  }
}

async function migrateArrayField(doc, field, folder, report) {
  if (!Array.isArray(doc[field]) || doc[field].length === 0) return false;
  let changed = false;
  const updated = [];
  for (const item of doc[field]) {
    const val = typeof item === 'string' ? item.trim() : '';
    if (!val) continue;
    if (isCloudinaryUrl(val)) {
      const normalized = val.replace(/^http:\/\//i, 'https://');
      if (normalized !== item) changed = true;
      updated.push(normalized);
      continue;
    }
    try {
      const cloudUrl = await ensureCloudinaryUrl(val, { folder, timeoutMs: 45000 });
      updated.push(cloudUrl);
      report.migrated++;
      changed = true;
    } catch (err) {
      report.failed.push({ id: doc._id?.toString(), field, sample: val.slice(0, 80), error: err.message });
      updated.push(val);
    }
  }
  if (changed) doc[field] = updated;
  return changed;
}

async function uploadKeyPublicAssets() {
  const keyAssets = [
    'hero_banner_card.png',
    'banner_curd_paneer.png',
    'banner_ghee_butter.png',
    'banner_dairy_sweets.png',
    'footer_farm_bg.jpg',
    'dairy_hero.jpg',
    'sub_hero_banner.png',
    'sub_hero_milk.png',
  ];

  const urls = {};
  for (const file of keyAssets) {
    const fullPath = path.join(PUBLIC_DIR, file);
    if (!fs.existsSync(fullPath)) continue;
    const publicId = path.parse(file).name;
    const res = await cloudinary.uploader.upload(fullPath, {
      folder: 'natural-milk-dairy/assets',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });
    urls[file] = res.secure_url;
  }
  return urls;
}

async function run() {
  const dryAudit = process.argv.includes('--audit');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
  console.log('Connected to MongoDB Atlas.');

  const report = { migrated: 0, failed: [], deliveriesChecked: 0, productsChecked: 0, bannersChecked: 0, usersChecked: 0 };

  if (dryAudit) {
    const [deliveries, products, banners, users] = await Promise.all([
      Delivery.find({ proofImage: { $exists: true, $ne: '' } }, 'proofImage deliveryDate customerName').lean(),
      Product.find({}, 'name image imageUrl images gallery').lean(),
      Banner.find({}, 'title imageUrl').lean(),
      User.find({ avatar: { $exists: true, $ne: '' } }, 'name avatar').lean(),
    ]);
    const nonCloudDeliveries = deliveries.filter((d) => !isCloudinaryUrl(d.proofImage));
    const nonCloudProducts = products.filter(
      (p) => (p.image && !isCloudinaryUrl(p.image)) ||
             (p.imageUrl && !isCloudinaryUrl(p.imageUrl)) ||
             (Array.isArray(p.images) && p.images.some((x) => x && !isCloudinaryUrl(x))) ||
             (Array.isArray(p.gallery) && p.gallery.some((x) => x && !isCloudinaryUrl(x)))
    );
    const nonCloudBanners = banners.filter((b) => b.imageUrl && !isCloudinaryUrl(b.imageUrl));
    const nonCloudUsers = users.filter((u) => u.avatar && !isCloudinaryUrl(u.avatar));
    console.log(JSON.stringify({
      deliveriesTotalWithProof: deliveries.length,
      nonCloudDeliveries: nonCloudDeliveries.map((d) => ({ id: d._id, date: d.deliveryDate, sample: String(d.proofImage).slice(0, 60) })),
      productsTotal: products.length,
      nonCloudProducts: nonCloudProducts.map((p) => ({ id: p._id, name: p.name, image: p.image, imageUrl: p.imageUrl })),
      bannersTotal: banners.length,
      nonCloudBanners: nonCloudBanners.map((b) => ({ id: b._id, title: b.title, imageUrl: b.imageUrl })),
      nonCloudUsers: nonCloudUsers.length,
    }, null, 2));
    await mongoose.disconnect();
    return;
  }

  // 1. Upload key public assets so banners/UI assets live on Cloudinary
  const assetUrls = await uploadKeyPublicAssets();
  console.log('Uploaded public assets to Cloudinary:', assetUrls);

  // 2. Migrate Deliveries
  const deliveries = await Delivery.find({ proofImage: { $exists: true, $ne: '' } });
  report.deliveriesChecked = deliveries.length;
  for (const d of deliveries) {
    if (await migrateField(d, 'proofImage', 'natural-milk-dairy/delivery-proofs', report)) {
      await d.save();
    }
  }

  // 3. Migrate Products
  const products = await Product.find({});
  report.productsChecked = products.length;
  for (const p of products) {
    let changed = false;
    if (await migrateField(p, 'image', 'natural-milk-dairy/products', report)) changed = true;
    if (await migrateField(p, 'imageUrl', 'natural-milk-dairy/products', report)) changed = true;
    if (await migrateArrayField(p, 'images', 'natural-milk-dairy/products', report)) changed = true;
    if (await migrateArrayField(p, 'gallery', 'natural-milk-dairy/products', report)) changed = true;
    if (!p.image && p.imageUrl) { p.image = p.imageUrl; changed = true; }
    if (!p.imageUrl && p.image) { p.imageUrl = p.image; changed = true; }
    if (changed) await p.save();
  }

  // 4. Migrate Banners
  const banners = await Banner.find({});
  report.bannersChecked = banners.length;
  for (const b of banners) {
    if (await migrateField(b, 'imageUrl', 'natural-milk-dairy/banners', report)) {
      await b.save();
    }
  }

  // 5. Migrate User avatars
  const users = await User.find({ avatar: { $exists: true, $ne: '' } });
  report.usersChecked = users.length;
  for (const u of users) {
    if (await migrateField(u, 'avatar', 'natural-milk-dairy/avatars', report)) {
      await u.save();
    }
  }

  // Clean up any leftover local files in server/uploads except .gitkeep
  if (fs.existsSync(LEGACY_UPLOADS_DIR)) {
    for (const file of fs.readdirSync(LEGACY_UPLOADS_DIR)) {
      if (file.startsWith('.')) continue;
      try {
        fs.unlinkSync(path.join(LEGACY_UPLOADS_DIR, file));
      } catch (_) {}
    }
  }

  console.log('Migration Report:', JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Migration error:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
