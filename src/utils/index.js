require('dotenv').config();
const cloudinary = require('../configs/cloudinary');
const { transporter } = require('../configs/nodemailer');
const CryptoJS = require('crypto-js');

const uploadImage = async (file) => {
    console.log('file', file);

    try {
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: file.filename,
            folder: 'NCKH',
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

const uploadQRBase64 = async (base64) => {
    try {
        const result = await cloudinary.uploader.upload(base64, {
            public_id: `QRCode-${Date.now()}`,
            folder: 'QRCode',
        });

        return result.secure_url;
    } catch (error) {
        return error;
    }
};

const genOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp;
};

const handleSendMail = async (val) => {
    try {
        await transporter.sendMail(val);
        return 'OK';
    } catch (error) {
        console.log('ERROR', error);
        return error;
    }
};

const encryptData = (data) => {
    const cipherText = CryptoJS.AES.encrypt(data, process.env.CRYPTO_SECRET_KEY).toString();
    return cipherText;
};

const decryptData = (cipherText) => {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, process.env.CRYPTO_SECRET_KEY);
        if (bytes.sigBytes > 0) {
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            return originalText;
        }
    } catch (error) {
        return 'error';
    }
};

module.exports = {
    uploadImage,
    genOTP,
    handleSendMail,
    encryptData,
    decryptData,
    uploadQRBase64,
};
