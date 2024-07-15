const UserModel = require('../models/userModel');
const { uploadImage } = require('../utils');
const asyncHandler = require('express-async-handler');

const GetUsers = asyncHandler(async (req, res) => {
    try {
        if (req.query.page && req.query.limit) {
            const page = parseInt(req.page) || 1;
            const limit = parseInt(req.limit) || 10;
            const Users = await UserModel.find({})
                .skip((page - 1) * limit)
                .limit(limit);

            const totalUsers = await UserModel.countDocuments({});

            res.json({
                data: Users,
                page,
                limit,
                totalUsers,
            });
        } else {
            const Users = await UserModel.find({});
            res.status(200).json({ data: Users });
        }
    } catch (error) {
        console.log('ERROR:', error);
        res.status(500).json({ message: error.message });
    }
});

const UploadSingle = asyncHandler(async (req, res) => {
    try {
        let result;
        const file = req.file;
        console.log('req', { req: file });
        if (file) {
            result = await uploadImage(file);
        } else {
            throw new Error('No file found');
        }

        res.status(200).json({ data: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const UploadMultiple = asyncHandler(async (req, res) => {
    console.log(req.files);
    try {
        let result = [];
        if (req.files) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const upload = await uploadImage(file, null);
                result.push(upload);
            }
        }

        res.status(200).json({ data: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = {
    GetUsers,
    UploadSingle,
    UploadMultiple,
};
