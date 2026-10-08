const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function syncImages() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const mappings = {
    'Farm Fresh Cow Milk 1L': '/product-cow-milk.jpg',
    'Farm Fresh Cow Milk 500ml': '/product-cow-milk.jpg',
    'Pure Buffalo Milk 1L': '/product-buffalo-milk.jpg',
    'Thick Farm Curd 500g': '/product-curd.jpg',
    'Thick Farm Curd 1kg': '/product-curd.jpg',
    'A2 Vedic Desi Ghee 500ml': '/product-ghee.jpg',
    'Fresh Malai Paneer 500g': '/product-paneer.jpg',
  };

  for (const [name, img] of Object.entries(mappings)) {
    const res = await Product.updateMany({ name }, { $set: { image: img } });
    console.log(`Updated ${name}: modified ${res.modifiedCount}`);
  }

  const all = await Product.find({}, 'name image price unit');
  console.log('Current Atlas Products with Images:');
  all.forEach((p) => console.log(` - ${p.name} (${p.unit}): ${p.image}`));

  await mongoose.disconnect();
}

syncImages().catch(console.error);
