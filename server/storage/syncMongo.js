const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');

let isSyncing = false;

const syncStoreToMongo = async () => {
  if (mongoose.connection.readyState !== 1) return;
  if (isSyncing) return;

  isSyncing = true;
  try {
    const store = require('./store');

    // Sync Products
    if (store.data.products?.length > 0) {
      for (const p of store.data.products) {
        await Product.updateOne(
          { name: p.name },
          {
            $set: {
              name: p.name,
              category: p.category || 'milk',
              unit: p.unit || 'L',
              price: p.price,
              status: p.status || 'active',
              description: p.description || '',
            },
          },
          { upsert: true }
        );
      }
    }

    // Sync Users
    if (store.data.users?.length > 0) {
      for (const u of store.data.users) {
        await User.updateOne(
          { mobile: u.mobile },
          {
            $set: {
              name: u.name,
              mobile: u.mobile,
              password: u.password,
              role: u.role,
              status: u.status || 'active',
              assignedArea: u.assignedArea || '',
            },
          },
          { upsert: true }
        );
      }
    }

    // Sync Customers
    if (store.data.customers?.length > 0) {
      for (const c of store.data.customers) {
        await Customer.updateOne(
          { customerId: c.customerId || c.id },
          {
            $set: {
              customerId: c.customerId || c.id,
              name: c.name,
              mobile: c.mobile,
              whatsapp: c.whatsapp || c.mobile,
              address: c.address,
              area: c.area || '',
              landmark: c.landmark || '',
              latitude: c.latitude || null,
              longitude: c.longitude || null,
              status: c.status || 'active',
              pauseFrom: c.pauseFrom || null,
              pauseUntil: c.pauseUntil || null,
              temporaryQty: c.temporaryQty || null,
              deliveryPlan: c.deliveryPlan || {},
              paymentInfo: c.paymentInfo || {},
              currentBalance: c.currentBalance || 0,
              notes: c.notes || '',
            },
          },
          { upsert: true }
        );
      }
    }

    // Sync Deliveries
    if (store.data.deliveries?.length > 0) {
      for (const d of store.data.deliveries.slice(-50)) {
        await Delivery.updateOne(
          { customerId: d.customerId, deliveryDate: d.deliveryDate },
          {
            $set: {
              customerId: d.customerId,
              customerName: d.customerName,
              deliveryBoyId: d.deliveryBoyId,
              deliveryBoyName: d.deliveryBoyName || '',
              deliveryDate: d.deliveryDate,
              plannedMilk: d.plannedMilk,
              plannedCurd: d.plannedCurd,
              actualMilk: d.actualMilk,
              actualCurd: d.actualCurd,
              status: d.status,
              totalAmount: d.totalAmount,
              paymentStatus: d.paymentStatus,
              deliveredAt: d.deliveredAt ? new Date(d.deliveredAt) : null,
            },
          },
          { upsert: true }
        );
      }
    }
  } catch (err) {
    console.error('MongoDB sync error:', err.message);
  } finally {
    isSyncing = false;
  }
};

module.exports = { syncStoreToMongo };
