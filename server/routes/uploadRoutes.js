const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary, uploadUrlOrBase64, cloudinary } = require('../config/cloudinary');
const { verifyToken } = require('../middleware/authMiddleware');

// Configure multer with memory storage (no temp files on disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, SVG) are allowed'), false);
    }
  },
});

/**
 * Health check & verify Cloudinary connectivity
 * GET /api/upload/test
 */
router.get('/test', async (req, res) => {
  try {
    const pingRes = await cloudinary.api.ping();
    return res.json({
      success: true,
      message: 'Cloudinary is connected and verified',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      ping: pingRes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Cloudinary connection test failed',
      error: err.message,
    });
  }
});

/**
 * Upload single image via multipart/form-data
 * POST /api/upload
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }

    const folder = req.body.folder || 'natural-milk-dairy';

    try {
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
    } catch (cloudErr) {
      console.warn('Cloudinary upload warning:', cloudErr.message);

      // Save to client/public/uploads as reliable fallback
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(__dirname, '../../client/public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = req.file.mimetype.split('/')[1] || 'png';
      const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const localUrl = `/uploads/${filename}`;
      const isMissingPerm = cloudErr.message && cloudErr.message.includes('missing permissions');

      return res.status(201).json({
        success: true,
        message: isMissingPerm
          ? 'Image saved locally (Cloudinary API key is missing "create" permission in Cloudinary console)'
          : 'Image uploaded successfully',
        url: localUrl,
        warning: isMissingPerm ? 'Please enable "Create / Media Management" permission on your Cloudinary API key in Settings -> Access Keys.' : null,
      });
    }
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ success: false, message: 'Server upload error', error: err.message });
  }
});

/**
 * Upload image via Base64 or remote URL
 * POST /api/upload/base64
 */
router.post('/base64', async (req, res) => {
  try {
    const { image, folder = 'natural-milk-dairy' } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image base64 string or URL is required' });
    }

    const result = await uploadUrlOrBase64(image, folder);

    return res.status(201).json({
      success: true,
      message: 'Image successfully stored in Cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('Cloudinary base64 upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image to Cloudinary',
      error: err.message,
    });
  }
});

module.exports = router;
