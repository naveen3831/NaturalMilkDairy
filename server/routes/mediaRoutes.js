const express = require('express');
const router = express.Router();
const MediaAsset = require('../models/MediaAsset');
const ContactInfo = require('../models/ContactInfo');

// In-memory cache for ultra-fast media map delivery (< 1ms)
let cachedMediaAll = null;
let cachedMediaAllTime = 0;
let cachedMediaFooter = null;
let cachedMediaFooterTime = 0;
const MEDIA_CACHE_TTL = 120 * 1000; // 2 minutes

/**
 * Public: Get all media assets stored in MongoDB Atlas
 * GET /api/media
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    if (!category && cachedMediaAll && (Date.now() - cachedMediaAllTime < MEDIA_CACHE_TTL)) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json(cachedMediaAll);
    }

    const filter = category ? { category } : {};
    const assets = await MediaAsset.find(filter).sort({ category: 1, key: 1 }).lean();

    const urlMap = {};
    assets.forEach((a) => {
      urlMap[a.key] = a.cloudinaryUrl;
      if (a.filename) urlMap[a.filename] = a.cloudinaryUrl;
    });

    const contact = await ContactInfo.findOne({ isPrimary: true }).lean();

    const payload = {
      success: true,
      total: assets.length,
      assets,
      mediaMap: urlMap,
      footer: {
        footerBgImage: contact?.footerBgImage || urlMap['footer_farm_bg.jpg'] || urlMap['footer_farm_bg'],
        footerFarmLandscape: contact?.footerFarmLandscape || urlMap['footer_farm_landscape'],
        footerLogo: contact?.footerLogo || urlMap['logo.png'] || urlMap['logo'],
      },
    };

    if (!category) {
      cachedMediaAll = payload;
      cachedMediaAllTime = Date.now();
    }

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json(payload);
  } catch (err) {
    console.error('Error fetching media assets:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch media assets' });
  }
});

/**
 * Public: Get footer specific assets
 * GET /api/media/footer
 */
router.get('/footer', async (req, res) => {
  try {
    if (cachedMediaFooter && (Date.now() - cachedMediaFooterTime < MEDIA_CACHE_TTL)) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json(cachedMediaFooter);
    }

    const footerAssets = await MediaAsset.find({ category: 'footer' }).lean();
    const contact = await ContactInfo.findOne({ isPrimary: true }).lean();

    const payload = {
      success: true,
      footer: {
        footerBgImage: contact?.footerBgImage,
        footerLogo: contact?.footerLogo,
        footerFarmLandscape: contact?.footerFarmLandscape,
      },
      assets: footerAssets,
    };

    cachedMediaFooter = payload;
    cachedMediaFooterTime = Date.now();

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json(payload);
  } catch (err) {
    console.error('Error fetching footer media:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch footer media' });
  }
});

module.exports = router;
