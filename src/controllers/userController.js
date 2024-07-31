const mongoose = require('mongoose');
const UserModel = require('../models/userModel');
const { uploadImage } = require('../utils');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// [GET] /api/v1/users/get-all
const GetUsers = asyncHandler(async (req, res) => {
    let { page, size, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
        ];
    }

    const users = await UserModel.find(query)
        .select('-password -__v')
        .populate('role', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total_documents = await UserModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            users,
        },
    });
});

// [GET] /api/v1/users/:id
const getUserByIdOrUsername = asyncHandler(async (req, res) => {
    const idOrUsername = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrUsername) ? { _id: idOrUsername } : { username: idOrUsername };

    const user = await UserModel.findOne(query).select('-password -__v').populate('role', 'name');

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    res.status(200).json({
        status: 'success',
        data: user,
    });
});

// [PUT] /api/v1/users/:id
const UpdateUser = asyncHandler(async (req, res) => {
    const fullName = req.body.fullName;
    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.role;

    if (!mongoose.Types.ObjectId.isValid(role)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role id');
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
    }

    const user = await UserModel.findById(req.params.id);

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (password) {
        user.password = await bcrypt.hash(req.body.password, 10);
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.role = role || user.role;

    const updatedUser = await user.save();
    res.status(200).json({ status: 'success', data: updatedUser });
});

// [POST] /api/v1/utils/upload
const UploadSingle = asyncHandler(async (req, res) => {
    try {
        let result;
        const file = req.file;
        console.log('req', { req: file });
        if (file) {
            result = await uploadImage(file);
        } else {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'File not found');
        }

        res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, error.message);
    }
});

// [POST] /api/v1/utils/upload-multiple
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

        res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, error.message);
    }
});

module.exports = {
    GetUsers,
    UploadSingle,
    UploadMultiple,
    getUserByIdOrUsername,
    UpdateUser,
};
