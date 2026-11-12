const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const PUBLIC_ASSET_DIR = path.join(__dirname, '../../client/public');
const LEGACY_UPLOADS_DIR = path.join(__dirname, '../uploads');

const isCloudinaryUrl = (url) => {
  const clean = typeof url === 'string' ? url.trim() : '';
  return /^https?:\/\/res\.cloudinary\.com\//i.test(clean);
};

/**
 * Upload memory buffer to Cloudinary
 * @param {Buffer} fileBuffer - Buffer from multer
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'natural-milk-dairy') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Upload from URL, local file path, or base64 string
 * @param {string} source - Public image URL, local file path, or dataURI
 * @param {string} folder - Folder name
 * @returns {Promise<object>}
 */
const uploadUrlOrBase64 = async (source, folder = 'natural-milk-dairy') => {
  return await cloudinary.uploader.upload(source, {
    folder,
    resource_type: 'auto',
  });
};

/**
 * Enforce Cloudinary storage for ANY image value before persisting to MongoDB.
 * Accepts existing Cloudinary URLs, data:image/* base64 strings, raw base64 strings,
 * local /public or /uploads paths, or external URLs and returns a guaranteed Cloudinary HTTPS URL.
 */
const ensureCloudinaryUrl = async (
  source,
  { folder = 'natural-milk-dairy', required = false, timeoutMs = 30000 } = {}
) => {
  const raw = typeof source === 'string' ? source.trim() : '';
  if (!raw) {
    if (required) throw new Error('Image is required and must be stored in Cloudinary.');
    return '';
  }

  // Already a Cloudinary URL -> normalize to HTTPS
  if (isCloudinaryUrl(raw)) {
    return raw.replace(/^http:\/\//i, 'https://');
  }

  const runWithTimeout = async (promise) => {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Cloudinary upload timed out')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  let uploadTarget = raw;

  // Handle raw base64 without data URI prefix
  if (!raw.startsWith('data:') && !/^https?:\/\//i.test(raw) && !raw.startsWith('/')) {
    if (raw.length > 100 && !raw.includes('.')) {
      uploadTarget = `data:image/jpeg;base64,${raw}`;
    } else {
      const candidatePublic = path.join(PUBLIC_ASSET_DIR, raw.replace(/^\/+/, ''));
      const candidateUpload = path.join(LEGACY_UPLOADS_DIR, path.basename(raw));
      if (fs.existsSync(candidatePublic)) {
        uploadTarget = candidatePublic;
      } else if (fs.existsSync(candidateUpload)) {
        uploadTarget = candidateUpload;
      } else {
        throw new Error(`Invalid local image path "${raw}" — image must be uploaded to Cloudinary.`);
      }
    }
  } else if (raw.startsWith('/')) {
    const cleanRel = raw.replace(/^\/+/, '');
    const candidateUpload = path.join(LEGACY_UPLOADS_DIR, path.basename(cleanRel));
    const candidatePublic = path.join(PUBLIC_ASSET_DIR, cleanRel);
    if (cleanRel.startsWith('uploads/') && fs.existsSync(candidateUpload)) {
      uploadTarget = candidateUpload;
    } else if (fs.existsSync(candidatePublic)) {
      uploadTarget = candidatePublic;
    } else if (fs.existsSync(candidateUpload)) {
      uploadTarget = candidateUpload;
    } else {
      throw new Error(`Local asset "${raw}" could not be resolved for Cloudinary upload.`);
    }
  }

  const res = await runWithTimeout(uploadUrlOrBase64(uploadTarget, folder));
  if (!res || !res.secure_url) {
    throw new Error('Cloudinary did not return a secure image URL.');
  }
  return res.secure_url;
};

module.exports = {
  cloudinary,
  isCloudinaryUrl,
  uploadToCloudinary,
  uploadUrlOrBase64,
  ensureCloudinaryUrl,
};
