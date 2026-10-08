const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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
 * Upload from URL or base64 string
 * @param {string} source - Public image URL or dataURI
 * @param {string} folder - Folder name
 * @returns {Promise<object>}
 */
const uploadUrlOrBase64 = async (source, folder = 'natural-milk-dairy') => {
  return await cloudinary.uploader.upload(source, {
    folder,
    resource_type: 'auto',
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadUrlOrBase64,
};
