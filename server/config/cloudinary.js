const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const PUBLIC_ASSET_DIR = path.resolve(__dirname, '../../client/public');
const LEGACY_UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const ALLOWED_DATA_URI_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const ALLOWED_FOLDERS = new Set([
  'natural-milk-dairy',
  'products',
  'deliveries',
  'banners',
  'profiles',
  'uploads',
]);

const sanitizeCloudinaryFolder = (folder) => {
  const clean = typeof folder === 'string' ? folder.trim().replace(/^\/+|\/+$/g, '') : '';
  if (ALLOWED_FOLDERS.has(clean)) return clean;
  return 'natural-milk-dairy';
};

const isCloudinaryUrl = (url) => {
  const clean = typeof url === 'string' ? url.trim() : '';
  return /^https:\/\/res\.cloudinary\.com\//i.test(clean);
};

/**
 * Upload memory buffer to Cloudinary
 * @param {Buffer} fileBuffer - Buffer from multer
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'natural-milk-dairy') => {
  const safeFolder = sanitizeCloudinaryFolder(folder);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: safeFolder,
        resource_type: 'image',
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
 * Upload from validated dataURI or safe local asset path
 * @param {string} source - dataURI or verified local asset path
 * @param {string} folder - Folder name
 * @returns {Promise<object>}
 */
const uploadUrlOrBase64 = async (source, folder = 'natural-milk-dairy') => {
  const safeFolder = sanitizeCloudinaryFolder(folder);
  return await cloudinary.uploader.upload(source, {
    folder: safeFolder,
    resource_type: 'image',
  });
};

/**
 * Enforce Cloudinary storage for ANY image value before persisting to MongoDB.
 * Blocks SSRF (arbitrary external HTTP URLs), SVGs, and path traversal.
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
  if (isCloudinaryUrl(raw) || /^http:\/\/res\.cloudinary\.com\//i.test(raw)) {
    return raw.replace(/^http:\/\//i, 'https://');
  }

  // Block arbitrary external URLs (SSRF prevention)
  if (/^https?:\/\//i.test(raw)) {
    throw new Error('External image URLs are not permitted. Please upload an image file directly.');
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

  if (raw.startsWith('data:')) {
    if (!ALLOWED_DATA_URI_RE.test(raw)) {
      throw new Error('Unsupported or unsafe image format. Only JPEG, PNG, WEBP, and GIF are allowed.');
    }
    uploadTarget = raw;
  } else if (!raw.startsWith('/')) {
    if (raw.length > 100 && /^[A-Za-z0-9+/=]+$/.test(raw)) {
      uploadTarget = `data:image/jpeg;base64,${raw}`;
    } else {
      throw new Error('Invalid image payload — must be a valid image upload or Cloudinary URL.');
    }
  } else {
    const cleanRel = raw.replace(/^\/+/, '');
    if (cleanRel.includes('..') || cleanRel.includes('\0')) {
      throw new Error('Invalid asset path.');
    }
    const candidatePublic = path.resolve(PUBLIC_ASSET_DIR, cleanRel);
    const candidateUpload = path.resolve(LEGACY_UPLOADS_DIR, path.basename(cleanRel));
    if (
      cleanRel.startsWith('images/') &&
      candidatePublic.startsWith(PUBLIC_ASSET_DIR + path.sep) &&
      fs.existsSync(candidatePublic)
    ) {
      uploadTarget = candidatePublic;
    } else if (
      cleanRel.startsWith('uploads/') &&
      candidateUpload.startsWith(LEGACY_UPLOADS_DIR + path.sep) &&
      fs.existsSync(candidateUpload)
    ) {
      uploadTarget = candidateUpload;
    } else {
      throw new Error('Local asset could not be resolved for Cloudinary upload.');
    }
  }

  const res = await runWithTimeout(uploadUrlOrBase64(uploadTarget, sanitizeCloudinaryFolder(folder)));
  if (!res || !res.secure_url) {
    throw new Error('Cloudinary did not return a secure image URL.');
  }
  return res.secure_url;
};

module.exports = {
  cloudinary,
  isCloudinaryUrl,
  sanitizeCloudinaryFolder,
  uploadToCloudinary,
  uploadUrlOrBase64,
  ensureCloudinaryUrl,
};
