const cloudinary = require('../configs/cloudinary');

const uploadImage = async (file, url) => {
    try {
        let dataURI = '';
        let filename = '';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        if (url) {
            const base64Data = await convertBlobToBase64(url);
            dataURI = `data:image/jpeg;base64,${base64Data}`;
            filename = `${url.split('/').pop()}-${uniqueSuffix}`;
        } else {
            const originalFilename = file.originalname.split('.')[0];
            filename = `${originalFilename}-${uniqueSuffix}`;
            const b64 = Buffer.from(file.buffer).toString('base64');
            dataURI = 'data:' + file.mimetype + ';base64,' + b64;
        }

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
