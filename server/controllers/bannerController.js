const Banner = require('../models/Banner');

const DEFAULT_BANNERS = [
  {
    title: 'Pure Milk. Healthier Lives.',
    subtitle: 'Fresh farm harvest delivered to your doorstep daily before 6:30 AM.',
    imageUrl: '/hero_banner_card.png',
    category: 'milk',
    order: 0,
    isActive: true,
  },
  {
    title: 'Artisanal Curd & Soft Paneer',
    subtitle: 'Naturally set in traditional clay pots. Rich, creamy, and probiotic.',
    imageUrl: '/banner_curd_paneer.png',
    category: 'curd',
    order: 1,
    isActive: true,
  },
  {
    title: 'A2 Vedic Desi Cow Ghee',
    subtitle: 'Slow-simmered bilona method with authentic granular golden aroma.',
    imageUrl: '/banner_ghee_butter.png',
    category: 'ghee',
    order: 2,
    isActive: true,
  },
  {
    title: 'Pure Milk Dairy Sweets',
    subtitle: 'Delicious handcrafted traditional sweets made 100% from farm dairy.',
    imageUrl: '/banner_dairy_sweets.png',
    category: 'sweets',
    order: 3,
    isActive: true,
  },
];

// Seed default banners if DB is empty
const ensureDefaultBanners = async () => {
  try {
    const count = await Banner.countDocuments();
    if (count === 0) {
      await Banner.insertMany(DEFAULT_BANNERS);
    }
  } catch (err) {
    console.error('Error seeding banners:', err.message);
  }
};

/**
 * Public: Get active banners sorted by order
 * GET /api/banners
 */
exports.getBanners = async (req, res) => {
  try {
    await ensureDefaultBanners();
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    if (banners && banners.length > 0) {
      return res.json({ success: true, banners });
    }
    return res.json({ success: true, banners: DEFAULT_BANNERS });
  } catch (err) {
    return res.json({ success: true, banners: DEFAULT_BANNERS });
  }
};

/**
 * Admin: Get all banners (including inactive)
 * GET /api/banners/admin
 */
exports.getAllBannersAdmin = async (req, res) => {
  try {
    await ensureDefaultBanners();
    const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, banners });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Create banner
 * POST /api/banners
 */
exports.createBanner = async (req, res) => {
  try {
    const { title, subtitle, imageUrl, category, order, isActive } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, message: 'Title and image URL are required' });
    }
    const banner = new Banner({
      title,
      subtitle: subtitle || '',
      imageUrl,
      category: category || 'milk',
      order: Number(order) || 0,
      isActive: isActive !== false,
    });
    await banner.save();
    return res.status(201).json({ success: true, banner });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Update banner
 * PUT /api/banners/:id
 */
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, imageUrl, category, order, isActive } = req.body;
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (imageUrl !== undefined) banner.imageUrl = imageUrl;
    if (category !== undefined) banner.category = category;
    if (order !== undefined) banner.order = Number(order);
    if (isActive !== undefined) banner.isActive = Boolean(isActive);

    await banner.save();
    return res.json({ success: true, banner });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Delete banner
 * DELETE /api/banners/:id
 */
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await Banner.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
