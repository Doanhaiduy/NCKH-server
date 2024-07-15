const multer = require('multer');
const fs = require('fs');

const Upload_Directory = 'uploads/';

if (!fs.existsSync(Upload_Directory)) {
    fs.mkdirSync(Upload_Directory);
}

const multerStorage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, Upload_Directory);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileExtension = file.originalname.split('.').pop();
        const originalFilename = file.originalname.split('.')[0];
        const filename = `${originalFilename}-${uniqueSuffix}.${fileExtension}`;
        cb(null, filename);
    },
});

const upload = multer({ storage: multerStorage });

module.exports = upload;
