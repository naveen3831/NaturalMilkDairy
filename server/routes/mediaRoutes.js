const express = require('express');
const router = express.Router();
const MediaAsset = require('../models/MediaAsset');
const ContactInfo = require('../models/ContactInfo');

/**
 * Public: Get all media assets stored in MongoDB Atlas
 * GET /api/media
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const assets = await MediaAsset.find(filter).sort({ category: 1, key: 1 }).lean();

    const urlMap = {};
    assets.forEach((a) => {
      urlMap[a.key] = a.cloudinaryUrl;
      if (a.filename) urlMap[a.filename] = a.cloudinaryUrl;
    });

    const contact = await ContactInfo.findOne({ isPrimary: true }).lean();

    return res.json({
      success: true,
      total: assets.length,
      assets,
      mediaMap: urlMap,
      footer: {
        footerBgImage: contact?.footerBgImage || urlMap['footer_farm_bg.jpg'] || urlMap['footer_farm_bg'],
        footerFarmLandscape: contact?.footerFarmLandscape || urlMap['footer_farm_landscape'],
        footerLogo: contact?.footerLogo || urlMap['logo.png'] || urlMap['logo'],
      },
    });
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
    const footerAssets = await MediaAsset.find({ category: 'footer' }).lean();
    const contact = await ContactInfo.findOne({ isPrimary: true }).lean();

    return res.json({
      success: true,
      footer: {
        footerBgImage: contact?.footerBgImage,
        footerLogo: contact?.footerLogo,
        footerFarmLandscape: contact?.footerFarmLandscape,
      },
      assets: footerAssets,
    });
  } catch (err) {
    console.error('Error fetching footer media:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch footer media' });
  }
});

module.exports = router;
