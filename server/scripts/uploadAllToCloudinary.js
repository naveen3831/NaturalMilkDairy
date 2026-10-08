const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const Product = require('../models/Product');

const PUBLIC_DIR = path.join(__dirname, '../../client/public');

async function uploadFileToCloudinary(filePath, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: 'natural-milk-dairy',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

async function run() {
  console.log('--- CLOUDINARY SYNC RUNNER ---');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? `${process.env.CLOUDINARY_API_KEY.substring(0, 6)}...` : 'NONE');

  const files = [
    'product-cow-milk.jpg',
    'product-buffalo-milk.jpg',
    'product-curd.jpg',
    'product-ghee.jpg',
    'product-paneer.jpg',
    'cows-pasture.jpg',
    'glass-bottles.jpg',
    'milk-pour.jpg',
    'organic-farm.jpg',
    'hero-dairy.jpg',
    'logo.jpg',
  ];

  const uploadedUrls = {};

  for (const file of files) {
    const fullPath = path.join(PUBLIC_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    const publicId = path.parse(file).name;
    try {
      console.log(`Uploading ${file} ...`);
      const res = await uploadFileToCloudinary(fullPath, publicId);
      console.log(`✓ Uploaded ${file} -> ${res.secure_url}`);
      uploadedUrls[file] = res.secure_url;
    } catch (err) {
      console.error(`✗ Failed to upload ${file}:`, err.message || err);
    }
  }

  const uploadedCount = Object.keys(uploadedUrls).length;
  console.log(`\nUploaded ${uploadedCount} / ${files.length} images to Cloudinary.`);

  if (uploadedCount > 0) {
    console.log('\nConnecting to MongoDB Atlas to update Products...');
    await mongoose.connect(process.env.MONGODB_URI);

    const productMappings = [
      { filter: { name: /Cow Milk 1L/i }, file: 'product-cow-milk.jpg' },
      { filter: { name: /Cow Milk 500ml/i }, file: 'product-cow-milk.jpg' },
      { filter: { name: /Buffalo Milk/i }, file: 'product-buffalo-milk.jpg' },
      { filter: { name: /Curd 500g/i }, file: 'product-curd.jpg' },
      { filter: { name: /Curd 1kg/i }, file: 'product-curd.jpg' },
      { filter: { name: /Ghee/i }, file: 'product-ghee.jpg' },
      { filter: { name: /Paneer/i }, file: 'product-paneer.jpg' },
    ];

    for (const mapping of productMappings) {
      const url = uploadedUrls[mapping.file];
      if (url) {
        const updateRes = await Product.updateMany(mapping.filter, {
          $set: { image: url, imageUrl: url },
        });
        console.log(`Updated products matching ${JSON.stringify(mapping.filter)}: ${updateRes.modifiedCount} modified -> ${url}`);
      }
    }

    const allProducts = await Product.find({}, 'name image imageUrl');
    console.log('\nAtlas Products updated:');
    allProducts.forEach((p) => console.log(`- ${p.name}: ${p.image}`));

    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Fatal error in sync:', err);
  process.exit(1);
});
