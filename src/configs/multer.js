const multer = require('multer');
const fs = require('fs');
const schedule = require('node-schedule');

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

// Schedule to delete all files in Upload_Directory every 12 hours
schedule.scheduleJob('0 */12 * * *', () => {
    if (fs.existsSync(Upload_Directory)) {
        fs.readdir(Upload_Directory, (err, files) => {
            if (err) {
                console.log(err);
            } else {
                if (files.length > 0) {
                    files.forEach((file) => {
                        fs.unlinkSync(Upload_Directory + file);
                    });
                }
            }
        });
    }
});

const upload = multer({ storage: multerStorage });

module.exports = upload;
