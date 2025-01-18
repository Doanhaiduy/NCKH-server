require('dotenv').config();

const { transporter } = require('../configs/nodemailer');
// const crypto = require('crypto');
const cryptoJs = require('crypto-js');

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
    const key = process.env.CRYPTO_SECRET_KEY;
    const iv = cryptoJs.lib.WordArray.random(16);
    const encrypted = cryptoJs.AES.encrypt(JSON.stringify(data), key, {
        iv,
    });
    return {
        encryptedData: `${iv.toString()}:${encrypted.toString()}`,
        iv: iv.toString(),
    };
};

const decryptData = (encryptedData) => {
    const key = process.env.CRYPTO_SECRET_KEY;
    const [iv, encrypted] = encryptedData.split(':');
    const decrypted = cryptoJs.AES.decrypt(encrypted, key, {
        iv: cryptoJs.enc.Hex.parse(iv),
    });
    return {
        decryptedData: JSON.parse(decrypted.toString(cryptoJs.enc.Utf8)),
        iv,
    };
};
const getCurrentSemesterYear = () => {
    const date = new Date();
    let semester = 1;
    let year = date.getFullYear();

    if (date.getMonth() >= 2 && date.getMonth() <= 7) {
        semester = 2;
        year -= 1;
    } else if (date.getMonth() >= 8) {
        semester = 1;
    } else {
        year -= 1;
    }

    return { semester, year };
};

module.exports = {
    genOTP,
    handleSendMail,
    encryptData,
    decryptData,
    getCurrentSemesterYear,
};
