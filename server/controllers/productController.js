const Product = require('../models/Product');
const { recordAudit } = require('../services/auditService');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    return res.json({
      success: true,
      products: products.map((p) => {
        const img = p.image || p.imageUrl || '';
        return {
          ...p,
          id: p._id.toString(),
          image: img,
          imageUrl: img,
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { name: id };
    const product = await Product.findOne(query);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const oldPrice = product.price;
    const newPrice = Number(price);

    product.price = newPrice;
    product.updatedAt = new Date();
    await product.save();

    await recordAudit(
      'Product Price Changed',
      actor || 'Admin',
      `${product.name} price changed from ₹${oldPrice} to ₹${newPrice}`,
      'price'
    );

    return res.json({
      success: true,
      message: `Updated ${product.name} price to ₹${newPrice}`,
      product: {
        ...product.toObject(),
        id: product._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, category, unit, price, description, image, imageUrl, status, actor } = req.body;
    if (!name || !price || !unit) {
      return res.status(400).json({ success: false, message: 'Name, unit, and price are required' });
    }

    const cleanName = name.trim();
    const finalImg = (image || imageUrl || '').trim();
    const newProduct = await Product.create({
      name: cleanName,
      category: category || 'milk',
      unit: unit.trim(),
      price: Number(price),
      status: status || 'active',
      description: (description || '').trim(),
      image: finalImg,
      imageUrl: finalImg,
      updatedAt: new Date(),
    });

    await recordAudit('Product Added', actor || 'Admin', `Added new product ${cleanName} at ₹${price}`, 'price');

    return res.status(201).json({
      success: true,
      product: {
        ...newProduct.toObject(),
        id: newProduct._id.toString(),
        image: finalImg,
        imageUrl: finalImg,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, price, description, image, imageUrl, status, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { name: id };
    const product = await Product.findOne(query);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category;
    if (unit !== undefined) product.unit = unit.trim();
    if (price !== undefined) product.price = Number(price);
    if (description !== undefined) product.description = description.trim();
    if (image !== undefined || imageUrl !== undefined) {
      const updatedImg = (image !== undefined ? image : imageUrl).trim();
      product.image = updatedImg;
      product.imageUrl = updatedImg;
    }
    if (status !== undefined) product.status = status;
    product.updatedAt = new Date();

    await product.save();

    await recordAudit('Product Updated', actor || 'Admin', `Updated details for ${product.name}`, 'price');

    return res.json({
      success: true,
      product: {
        ...product.toObject(),
        id: product._id.toString(),
        image: product.image,
        imageUrl: product.imageUrl || product.image,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor } = req.body || {};

    const query = id.length === 24 ? { _id: id } : { name: id };
    const product = await Product.findOneAndDelete(query);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await recordAudit('Product Deleted', actor || 'Admin', `Deleted catalog product: ${product.name}`, 'price');

    return res.json({
      success: true,
      message: `Product ${product.name} removed successfully`,
      id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getProducts,
  updateProductPrice,
  addProduct,
  updateProduct,
  deleteProduct,
};
