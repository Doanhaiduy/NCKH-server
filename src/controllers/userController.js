const UserModel = require('../models/userModel');
const { uploadImage } = require('../utils/storage');
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
        res.status(500).json({ message: error.message });
    }
});

const UploadAvatar = asyncHandler(async (req, res) => {
    try {
        const result = await uploadImage(req.file);
        res.status(200).json({ data: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = {
    GetUsers,
    UploadAvatar,
};
