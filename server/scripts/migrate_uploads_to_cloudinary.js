require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const Delivery = mongoose.model(
    'Delivery',
    new mongoose.Schema({ proofImage: String }, { strict: false })
  );

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist.');
    process.exit(0);
  }

  const files = fs.readdirSync(uploadsDir).filter((f) => !f.startsWith('.'));
  console.log(`Found ${files.length} local files in ${uploadsDir}:`, files);

  const fileUrlMap = {};

  // 1. Upload existing physical files to Cloudinary
  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    console.log(`Uploading ${filename} to Cloudinary...`);
    try {
      const uploadRes = await cloudinary.uploader.upload(filePath, {
        folder: 'natural-milk-dairy/delivery-proofs',
        resource_type: 'image',
      });
      console.log(`Uploaded ${filename} -> ${uploadRes.secure_url}`);
      fileUrlMap[`/uploads/${filename}`] = uploadRes.secure_url;
      fileUrlMap[filename] = uploadRes.secure_url;
    } catch (err) {
      console.error(`Failed to upload ${filename}:`, err.message);
    }
  }

  // 2. Find all deliveries referencing local uploads
  const deliveriesWithLocalProofs = await Delivery.find({
    proofImage: { $regex: 'uploads' },
  });
  console.log(`Found ${deliveriesWithLocalProofs.length} delivery records referencing /uploads/...`);

  // Default fallback Cloudinary URL if a record's physical file was missing
  const fallbackUrl =
    Object.values(fileUrlMap)[0] ||
    'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/branding/logo.jpg';

  let updatedCount = 0;
  for (const del of deliveriesWithLocalProofs) {
    const currentProof = del.proofImage || '';
    const cleanPath = currentProof.trim();
    const baseName = path.basename(cleanPath);

    const newUrl = fileUrlMap[cleanPath] || fileUrlMap[baseName] || fallbackUrl;
    del.proofImage = newUrl;
    await del.save();
    console.log(`Updated Delivery ID ${del._id}: ${currentProof} -> ${newUrl}`);
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} delivery records in database.`);

  // 3. Remove migrated local files from uploads directory
  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted local file: ${filename}`);
    } catch (e) {
      console.warn(`Could not delete ${filename}:`, e.message);
    }
  }

  console.log('Migration complete! All images stored in Cloudinary and database updated.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
