const cloudinary = require('../configs/cloudinary');

const uploadImage = async (file) => {
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalFilename = file.originalname.split('.')[0];
        const filename = `${originalFilename}-${uniqueSuffix}`;

        const b64 = Buffer.from(file.buffer).toString('base64');
        let dataURI = 'data:' + file.mimetype + ';base64,' + b64;

        const result = await cloudinary.uploader.upload(dataURI, {
            public_id: filename,
            // folder: 'NCKH',
        });
        console.log(result);

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        return error;
    }
};

module.exports = {
    uploadImage,
};
