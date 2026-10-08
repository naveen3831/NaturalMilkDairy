const mongoose = require('mongoose');

let isMongoConnected = false;
let mongoConnectionInfo = null;

const initialProducts = [
  { name: 'Farm Fresh Cow Milk 1L', category: 'milk', unit: '1 L', price: 65, status: 'active', description: 'Freshly milked pure organic farm cow milk chilled to 4°C in sterilized glass bottles', image: '/product-cow-milk.jpg' },
  { name: 'Farm Fresh Cow Milk 500ml', category: 'milk', unit: '500 ml', price: 30, status: 'active', description: 'Convenient daily half-litre pack', image: '/product-cow-milk.jpg' },
  { name: 'Pure Buffalo Milk 1L', category: 'milk', unit: '1 L', price: 75, status: 'active', description: 'Rich creamy high-fat pure buffalo milk', image: '/product-buffalo-milk.jpg' },
  { name: 'Thick Farm Curd 500g', category: 'curd', unit: '500 g', price: 35, status: 'active', description: 'Traditional earthen pot set creamy dahi', image: '/product-curd.jpg' },
  { name: 'Thick Farm Curd 1kg', category: 'curd', unit: '1 kg', price: 65, status: 'active', description: 'Family pack thick probiotic curd', image: '/product-curd.jpg' },
  { name: 'A2 Vedic Desi Ghee 500ml', category: 'ghee', unit: '500 ml', price: 480, status: 'active', description: 'Traditional bilona churned pure cow ghee', image: '/product-ghee.jpg' },
  { name: 'Fresh Malai Paneer 500g', category: 'paneer', unit: '500 g', price: 190, status: 'active', description: 'Soft, melt-in-mouth cottage cheese', image: '/product-paneer.jpg' },
];

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/natural_milk_dairy';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    mongoConnectionInfo = {
      host: conn.connection.host,
      name: conn.connection.name,
      port: conn.connection.port,
    };
    console.log(`🌿 MongoDB Atlas Connected: ${conn.connection.host} [DB: ${conn.connection.name}]`);

    // Ensure catalog products exist in MongoDB Atlas
    try {
      const Product = require('../models/Product');
      const count = await Product.countDocuments();
      if (count === 0) {
        for (const p of initialProducts) {
          await Product.create(p);
        }
        console.log(`📦 Seeded ${initialProducts.length} catalog products to MongoDB Atlas.`);
      }
    } catch (seedErr) {
      console.log(`ℹ️ Catalog check: ${seedErr.message}`);
    }

    mongoose.connection.on('disconnected', () => {
      isMongoConnected = false;
      console.warn('⚠️ MongoDB disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      isMongoConnected = true;
      console.log('🌿 MongoDB reconnected.');
    });

    return conn;
  } catch (error) {
    isMongoConnected = false;
    console.log(`⚡ MongoDB connection note (${error.message}).`);
  }
};

const getMongoStatus = () => ({
  connected: isMongoConnected,
  info: mongoConnectionInfo,
});

module.exports = { connectDB, getMongoStatus };
