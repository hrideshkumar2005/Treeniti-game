const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Avatar uploads (small, square)
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'treeniti_avatars',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }]
  },
});

// Plantation proof uploads (larger, landscape)
const proofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'treeniti_proofs',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
  },
});

const uploadCloud = multer({ storage: avatarStorage });
const uploadProof = multer({ storage: proofStorage });

module.exports = { cloudinary, uploadCloud, uploadProof };
