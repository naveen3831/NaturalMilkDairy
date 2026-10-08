const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

const PUBLIC_DIR = path.join(__dirname, '../../client/public');
const OUTPUT_FILE = path.join(__dirname, '../storage/cloudinary_images.json');
const DB_FILE = path.join(__dirname, '../storage/dairy_db.json');

async function syncAllImages() {
  console.log('🚀 Starting Cloudinary Sync to cloud:', process.env.CLOUDINARY_CLOUD_NAME);

  const files = fs.readdirSync(PUBLIC_DIR).filter((f) => /\.(jpg|jpeg|png|webp|svg)$/i.test(f));
  const mapping = {};

  for (const filename of files) {
    const filePath = path.join(PUBLIC_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const publicId = path.parse(filename).name;

    console.log(`📤 Uploading ${filename} to Cloudinary...`);
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'natural-milk-dairy',
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
          },
          (err, res) => {
            if (err) return reject(err);
            resolve(res);
          }
        );
        stream.end(buffer);
      });

      console.log(`✅ ${filename} uploaded -> ${result.secure_url}`);
      mapping[filename] = result.secure_url;
      mapping['/' + filename] = result.secure_url;
    } catch (err) {
      console.error(`❌ Failed to upload ${filename}:`, err.message);
    }
  }

  // Save the Cloudinary image mapping
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log(`💾 Saved Cloudinary URLs mapping to: ${OUTPUT_FILE}`);

  // Update products in dairy_db.json with Cloudinary URLs
  if (fs.existsSync(DB_FILE)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (Array.isArray(db.products)) {
        db.products = db.products.map((p) => {
          let cUrl = '';
          if (p.category === 'milk' && p.name.includes('Buffalo')) {
            cUrl = mapping['product-buffalo-milk.jpg'] || '';
          } else if (p.category === 'milk') {
            cUrl = mapping['product-cow-milk.jpg'] || '';
          } else if (p.category === 'curd') {
            cUrl = mapping['product-curd.jpg'] || '';
          } else if (p.category === 'ghee') {
            cUrl = mapping['product-ghee.jpg'] || '';
          } else if (p.category === 'paneer') {
            cUrl = mapping['product-paneer.jpg'] || '';
          }
          return {
            ...p,
            image: cUrl || p.image || '',
          };
        });
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        console.log('✅ Updated products in dairy_db.json with Cloudinary image URLs');
      }
    } catch (e) {
      console.error('Failed to update dairy_db.json products:', e.message);
    }
  }

  console.log('🎉 Cloudinary sync completed successfully!');
  return mapping;
}

if (require.main === module) {
  syncAllImages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal sync error:', err);
      process.exit(1);
    });
}

module.exports = { syncAllImages };
