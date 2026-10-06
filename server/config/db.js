const mongoose = require('mongoose');

let isMongoConnected = false;
let mongoConnectionInfo = null;

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

    // Sync initial collections if needed
    try {
      const { syncStoreToMongo } = require('../storage/syncMongo');
      await syncStoreToMongo();
    } catch (syncErr) {
      console.log(`ℹ️ MongoDB sync note: ${syncErr.message}`);
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
    console.log(`📦 Using dairy persistence layer with JSON backup.`);
  }
};

const getMongoStatus = () => ({
  connected: isMongoConnected,
  info: mongoConnectionInfo,
});

module.exports = { connectDB, getMongoStatus };

