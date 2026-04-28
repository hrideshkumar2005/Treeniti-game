const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists natively
const uploadDir = path.join(__dirname, '../uploads/plantation_proofs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration (Market Standard for Local Uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        // Generates secure unique filename: user_123_1684343.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File Filter (Accept only Images)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, and WEBP image formats are allowed."), false);
    }
};

const uploadMiddleware = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max constraint
    fileFilter: fileFilter
});

module.exports = uploadMiddleware;
