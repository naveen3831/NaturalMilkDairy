const store = require('../storage/store');

const getProducts = (req, res) => {
  return res.json({ success: true, products: store.data.products });
};

const updateProductPrice = (req, res) => {
  const { id } = req.params;
  const { price, actor } = req.body;

  const product = store.data.products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const oldPrice = product.price;
  const newPrice = Number(price);

  product.price = newPrice;
  product.updatedAt = new Date().toISOString();

  // Rule 7: Historical transactions retain their price.
  // We do NOT mutate existing completed delivery records!

  store.addAudit(
    'Product Price Changed',
    actor || 'Admin',
    `${product.name} price changed from ₹${oldPrice} to ₹${newPrice}`,
    'price'
  );

  store.save();

  return res.json({
    success: true,
    message: `Updated ${product.name} price to ₹${newPrice}`,
    product,
  });
};

const addProduct = (req, res) => {
  const { name, category, unit, price, description, actor } = req.body;
  if (!name || !price || !unit) {
    return res.status(400).json({ success: false, message: 'Name, unit, and price are required' });
  }

  const newProduct = {
    id: 'prod_' + Date.now(),
    name,
    category: category || 'milk',
    unit,
    price: Number(price),
    status: 'active',
    description: description || '',
    updatedAt: new Date().toISOString(),
  };

  store.data.products.push(newProduct);
  store.addAudit('Product Added', actor || 'Admin', `Added new product ${name} at ₹${price}`, 'price');
  store.save();

  return res.status(201).json({ success: true, product: newProduct });
};

module.exports = { getProducts, updateProductPrice, addProduct };
