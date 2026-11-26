const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary, ensureCloudinaryUrl, sanitizeCloudinaryFolder, cloudinary } = require('../config/cloudinary');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Verify magic bytes of uploaded image buffer to prevent spoofed Content-Type / polyglots / SVGs.
 */
function hasValidImageMagicBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF: GIF87a or GIF89a
  if (buf.slice(0, 4).toString('ascii') === 'GIF8') return true;
  // WEBP: RIFF....WEBP
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;
  return false;
}

const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  message: 'Too many file upload requests. Please wait before trying again.',
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has((file.mimetype || '').toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only raster image files (JPEG, PNG, WEBP, GIF) are allowed'), false);
    }
  },
});

/**
 * Health check & verify Cloudinary connectivity (Admin only)
 * GET /api/upload/test
 */
router.get('/test', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pingRes = await cloudinary.api.ping();
    return res.json({
      success: true,
      message: 'Cloudinary is connected and verified',
      ping: pingRes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Cloudinary connection test failed',
    });
  }
});

/**
 * Upload single image via multipart/form-data directly to Cloudinary
 * POST /api/upload
 */
router.post('/', verifyToken, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }
    if (!hasValidImageMagicBytes(req.file.buffer)) {
      return res.status(400).json({ success: false, message: 'Invalid or corrupted image file signature.' });
    }

    const folder = sanitizeCloudinaryFolder(req.body.folder);
    const result = await uploadToCloudinary(req.file.buffer, folder);

    return res.status(201).json({
      success: true,
      message: 'Image successfully uploaded to Cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    return res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
});

/**
 * Upload image via validated Base64 data URI directly to Cloudinary
 * POST /api/upload/base64
 */
router.post('/base64', verifyToken, uploadLimiter, async (req, res) => {
  try {
    const { image, folder = 'natural-milk-dairy' } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid image base64 payload is required' });
    }

    const safeFolder = sanitizeCloudinaryFolder(folder);
    const secureUrl = await ensureCloudinaryUrl(image, { folder: safeFolder, required: true });

    return res.status(201).json({
      success: true,
      message: 'Image successfully stored in Cloudinary',
      url: secureUrl,
    });
  } catch (err) {
    console.error('Cloudinary base64 upload error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Failed to process image upload. Please provide a valid JPEG, PNG, WEBP, or GIF image.',
    });
  }
});

module.exports = router;
