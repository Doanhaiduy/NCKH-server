const cloudinary = require('../configs/cloudinary');
const { transporter } = require('../configs/nodemailer');

const uploadImage = async (file) => {
    console.log('file', file);

    try {
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: file.filename,
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

module.exports = {
    uploadImage,
    genOTP,
    handleSendMail,
};
