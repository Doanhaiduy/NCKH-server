require('dotenv').config();

const { transporter } = require('../configs/nodemailer');
const CryptoJS = require('crypto-js');

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
    genOTP,
    handleSendMail,
    encryptData,
    decryptData,
};
