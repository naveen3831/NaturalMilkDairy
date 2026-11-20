const Banner = require('../models/Banner');
const { ensureCloudinaryUrl } = require('../config/cloudinary');

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

// Seed default banners if DB is empty, uploading local defaults to Cloudinary first
const ensureDefaultBanners = async () => {
  try {
    const count = await Banner.countDocuments();
    if (count === 0) {
      const prepared = [];
      for (const b of DEFAULT_BANNERS) {
        const cloudUrl = await ensureCloudinaryUrl(b.imageUrl, {
          folder: 'natural-milk-dairy/banners',
        }).catch(() => b.imageUrl);
        prepared.push({ ...b, imageUrl: cloudUrl });
      }
      await Banner.insertMany(prepared);
    }
  } catch (err) {
    console.error('Error seeding banners:', err.message);
  }
};

// Run initial seed once on module load
ensureDefaultBanners();

// In-memory cache for ultra-fast public banners delivery (< 1ms)
let cachedBannersResponse = null;
let cachedBannersTime = 0;
const BANNERS_CACHE_TTL = 60 * 1000; // 60 seconds

const invalidateBannersCache = () => {
  cachedBannersResponse = null;
  cachedBannersTime = 0;
};

/**
 * Public: Get active banners sorted by order
 * GET /api/banners
 */
exports.getBanners = async (req, res) => {
  try {
    if (cachedBannersResponse && (Date.now() - cachedBannersTime < BANNERS_CACHE_TTL)) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json(cachedBannersResponse);
    }
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    const payload = (banners && banners.length > 0)
      ? { success: true, banners }
      : { success: true, banners: DEFAULT_BANNERS };

    cachedBannersResponse = payload;
    cachedBannersTime = Date.now();

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json(payload);
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
    const banners = await Banner.find().sort({ order: 1, createdAt: 1 }).lean();
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
    const finalImageUrl = await ensureCloudinaryUrl(imageUrl, {
      folder: 'natural-milk-dairy/banners',
      required: true,
    });
    const banner = new Banner({
      title,
      subtitle: subtitle || '',
      imageUrl: finalImageUrl,
      category: category || 'milk',
      order: Number(order) || 0,
      isActive: isActive !== false,
    });
    await banner.save();
    invalidateBannersCache();
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
    if (imageUrl !== undefined) {
      banner.imageUrl = await ensureCloudinaryUrl(imageUrl, {
        folder: 'natural-milk-dairy/banners',
        required: true,
      });
    }
    if (category !== undefined) banner.category = category;
    if (order !== undefined) banner.order = Number(order);
    if (isActive !== undefined) banner.isActive = Boolean(isActive);

    await banner.save();
    invalidateBannersCache();
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
    invalidateBannersCache();
    return res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
