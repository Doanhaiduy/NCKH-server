const cloudinary = require('../configs/cloudinary');
const uploadImage = async (file, folderName) => {
    console.log('file', file);
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: file.filename,
            folder: folderName ?? 'NCKH',
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

const uploadQRBase64 = async (base64, fileName) => {
    try {
        const result = await cloudinary.uploader.upload(base64, {
            public_id: `QRCode-${fileName ?? Date.now()}`,
            folder: 'QRCode',
        });

        return result.secure_url;
    } catch (error) {
        return error;
    }
};

const destroyImageByUrl = async (imageUrl) => {
    try {
        const public_id = `${imageUrl.split('/')[7]}/${imageUrl.split('/')[8].split('.')[0]}`;
        console.log(public_id);
        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        return error;
    }
};

const destroyImageByPublicId = async (public_id) => {
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        return error;
    }
};

module.exports = {
    uploadImage,
    uploadQRBase64,
    destroyImageByUrl,
    destroyImageByPublicId,
};
