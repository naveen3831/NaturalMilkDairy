require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const MediaAsset = require('../models/MediaAsset');
const ContactInfo = require('../models/ContactInfo');

const PUBLIC_DIR = path.join(__dirname, '../../client/public');
const BRAIN_DIR = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\95886dc4-1e52-4b90-b826-f6f62b2d096a';

const CATEGORY_MAP = (filename) => {
  const f = filename.toLowerCase();
  if (f.includes('footer')) return 'footer';
  if (f.includes('logo')) return 'logo';
  if (f.includes('banner')) return 'banner';
  if (f.includes('hero')) return 'hero';
  if (f.includes('cat_')) return 'category';
  if (f.includes('product') || f.includes('prod_') || f.includes('best_')) return 'product';
  if (f.includes('sub_')) return 'subscription';
  return 'general';
};

async function uploadSingleAsset(filePath, customPublicId, category = null) {
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] File does not exist: ${filePath}`);
    return null;
  }
  const filename = path.basename(filePath);
  const ext = path.extname(filename).replace('.', '');
  const baseKey = (customPublicId || path.parse(filename).name)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const assignedCategory = category || CATEGORY_MAP(filename);
  const folder = assignedCategory === 'footer' ? 'natural-milk-dairy/footer' : 'natural-milk-dairy/assets';

  console.log(`[UPLOADING] ${filename} -> Cloudinary (${folder}/${baseKey})...`);
  const uploadRes = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: baseKey,
    overwrite: true,
    resource_type: 'image',
  });

  const record = await MediaAsset.findOneAndUpdate(
    { key: baseKey },
    {
      key: baseKey,
      name: filename.replace(/[-_]/g, ' '),
      filename,
      category: assignedCategory,
      cloudinaryUrl: uploadRes.secure_url,
      secureUrl: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      format: uploadRes.format || ext,
      width: uploadRes.width,
      height: uploadRes.height,
      bytes: uploadRes.bytes,
      isDefault: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { key: baseKey, filename, url: uploadRes.secure_url, record };
}

async function run() {
  console.log('--- Connecting to MongoDB Atlas ---');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
  });
  console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

  const results = {};
  const files = fs.readdirSync(PUBLIC_DIR).filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f));
  console.log(`Found ${files.length} static image assets in client/public.`);

  for (const file of files) {
    try {
      const fullPath = path.join(PUBLIC_DIR, file);
      const res = await uploadSingleAsset(fullPath);
      if (res) results[file] = res.url;
    } catch (err) {
      console.error(`Error uploading ${file}:`, err.message);
    }
  }

  // Also upload the generated footer scenic images from the brain artifact directory
  const extraFooterAssets = [
    {
      filePath: path.join(BRAIN_DIR, 'footer_farm_landscape_1794473257439.jpg'),
      id: 'footer_farm_landscape',
      category: 'footer',
    },
    {
      filePath: path.join(BRAIN_DIR, 'footer_bg_light_1794473096392.jpg'),
      id: 'footer_bg_light',
      category: 'footer',
    },
  ];

  for (const item of extraFooterAssets) {
    try {
      const res = await uploadSingleAsset(item.filePath, item.id, item.category);
      if (res) results[item.id] = res.url;
    } catch (err) {
      console.error(`Error uploading extra footer asset ${item.id}:`, err.message);
    }
  }

  // Update ContactInfo in MongoDB with Cloudinary Footer and Logo URLs
  const footerBgUrl =
    results['footer_farm_bg.jpg'] ||
    results['footer_farm_landscape'] ||
    'https://res.cloudinary.com/ddgjubbbx/image/upload/v1794486539/natural-milk-dairy/assets/footer_farm_bg.jpg';
  const footerLogoUrl =
    results['logo.png'] ||
    results['logo.jpg'] ||
    'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454814/natural-milk-dairy/logo.jpg';
  const footerLandscapeUrl =
    results['footer_farm_landscape'] ||
    footerBgUrl;

  console.log('--- Updating ContactInfo in MongoDB Atlas with Footer URLs ---');
  let contact = await ContactInfo.findOne({ isPrimary: true });
  if (!contact) {
    contact = new ContactInfo({ isPrimary: true });
  }
  contact.footerBgImage = footerBgUrl;
  contact.footerLogo = footerLogoUrl;
  contact.footerFarmLandscape = footerLandscapeUrl;
  contact.logoUrl = footerLogoUrl;
  await contact.save();
  console.log('ContactInfo successfully updated in MongoDB Atlas:');
  console.log({
    footerBgImage: contact.footerBgImage,
    footerLogo: contact.footerLogo,
    footerFarmLandscape: contact.footerFarmLandscape,
  });

  const totalMediaInDb = await MediaAsset.countDocuments();
  console.log(`\n=== SUCCESS: ${totalMediaInDb} Media Assets now stored in MongoDB Atlas & Cloudinary ===\n`);

  // Write mapping to a JSON file for easy import into constants
  const outJson = path.join(__dirname, 'uploaded_cloudinary_assets.json');
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
  console.log(`Asset URL map saved to: ${outJson}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
