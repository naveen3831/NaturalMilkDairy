const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['milk', 'curd', 'ghee', 'paneer', 'butter', 'other'], default: 'milk' },
  unit: { type: String, required: true }, // 'L', '500ml', '500g', '1kg'
  price: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
