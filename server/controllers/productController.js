const Product = require('../models/Product');
const { recordAudit } = require('../services/auditService');
const { broadcast } = require('../config/websocket');
const { ensureCloudinaryUrl } = require('../config/cloudinary');

const uploadProductImagesList = async (list) => {
  if (!Array.isArray(list)) return [];
  const results = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      results.push(await ensureCloudinaryUrl(item.trim(), { folder: 'natural-milk-dairy/products' }));
    }
  }
  return results;
};

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
          images: Array.isArray(p.images) ? p.images : [],
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

    broadcast('PRODUCT_UPDATED', {});

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
    const { name, category, unit, price, description, image, imageUrl, images, gallery, status, actor } = req.body;
    if (!name || !price || !unit) {
      return res.status(400).json({ success: false, message: 'Name, unit, and price are required' });
    }

    const cleanName = name.trim();
    const rawImg = (image || imageUrl || '').trim();
    const finalImg = rawImg
      ? await ensureCloudinaryUrl(rawImg, { folder: 'natural-milk-dairy/products' })
      : '';
    const finalImages = await uploadProductImagesList(images);
    const finalGallery = await uploadProductImagesList(gallery);

    const newProduct = await Product.create({
      name: cleanName,
      category: category || 'milk',
      unit: unit.trim(),
      price: Number(price),
      status: status || 'active',
      description: (description || '').trim(),
      image: finalImg,
      imageUrl: finalImg,
      images: finalImages,
      gallery: finalGallery,
      updatedAt: new Date(),
    });

    await recordAudit('Product Added', actor || 'Admin', `Added new product ${cleanName} at ₹${price}`, 'price');

    broadcast('PRODUCT_UPDATED', {});

    return res.status(201).json({
      success: true,
      product: {
        ...newProduct.toObject(),
        id: newProduct._id.toString(),
        image: finalImg,
        imageUrl: finalImg,
        images: newProduct.images || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, price, description, image, imageUrl, images, gallery, status, actor } = req.body;

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
      const rawUpdated = (image !== undefined ? image : imageUrl).trim();
      const updatedImg = rawUpdated
        ? await ensureCloudinaryUrl(rawUpdated, { folder: 'natural-milk-dairy/products' })
        : '';
      product.image = updatedImg;
      product.imageUrl = updatedImg;
    }
    if (images !== undefined && Array.isArray(images)) {
      product.images = await uploadProductImagesList(images);
    }
    if (gallery !== undefined && Array.isArray(gallery)) {
      product.gallery = await uploadProductImagesList(gallery);
    }
    if (status !== undefined) product.status = status;
    product.updatedAt = new Date();

    await product.save();

    await recordAudit('Product Updated', actor || 'Admin', `Updated details for ${product.name}`, 'price');

    broadcast('PRODUCT_UPDATED', {});

    return res.json({
      success: true,
      product: {
        ...product.toObject(),
        id: product._id.toString(),
        image: product.image,
        imageUrl: product.imageUrl || product.image,
        images: product.images || [],
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

    broadcast('PRODUCT_UPDATED', {});

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
