const mongoose = require('mongoose');
const UserModel = require('../models/userModel');
const ClassModel = require('../models/sclassModel');
const { uploadImage } = require('../utils/cloudinary');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { handleCache, setCache } = require('../configs/redis');
const pLimit = require('p-limit');
const cloudinary = require('../configs/cloudinary');

// [GET] /api/v1/users/get-all
const GetUsers = asyncHandler(async (req, res) => {
    let { page, size, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `users_${page ? page : ''}_${size ? size : ''}_${search ? search : ''}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

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
        .populate('sclassName', 'sclassName _id teacher')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    const total_documents = await UserModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    if (users.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: +page,
                size: +size,
                previous: previous_pages,
                next: next_pages,
                users,
            },
            120,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
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

    const user = await UserModel.findOne(query).select('-password -__v').populate('role', 'name').lean();

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
    const sclass = req.body.sclass;
    const avatar = req.body.avatar;

    if (role && !mongoose.Types.ObjectId.isValid(role)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role id');
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
    }

    if (sclass && !mongoose.Types.ObjectId.isValid(sclass)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid class id');
    }

    const user = await UserModel.findById(req.params.id);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const classExist = await ClassModel.findById(sclass);
    if (sclass && !classExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Class not found');
    }

    if (password) {
        user.password = await bcrypt.hash(req.body.password, 10);
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.role = role || user.role;
    user.sclass = sclass || user.sclass;
    user.avatar = avatar || user.avatar;

    const updatedUser = await user.save();
    res.status(200).json({ status: 'success', data: updatedUser });
});

// [DELETE] /api/v1/users/:id
const DeleteUser = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id');
    }

    const user = await UserModel.findById(req.params.id);

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    await user.deleteOne();

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully',
    });
});

// [POST] /api/v1/utils/upload
const UploadSingle = asyncHandler(async (req, res) => {
    try {
        let result;
        const file = req.file;
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
    const limit = pLimit(15);
    let result = [];
    if (req.files) {
        result = req.files.map(async (file) => {
            return limit(async () => {
                const upload = await cloudinary.uploader.upload(file.path, {
                    public_id: file.filename,
                    folder: 'Test',
                });
                return upload;
            });
        });

        result = await Promise.all(result);
    }

    res.status(200).json({
        status: 'success',
        data: result,
    });
});

const GetUsersByClassId = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    let { page, size, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid class id');
    }

    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `users_${page ? page : ''}_${size ? size : ''}_${search ? search : ''}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    const query = {};

    query.sclassName = classId;

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } },
        ];
    }

    const users = await UserModel.find(query)
        .select('username fullName email avatar')
        .populate('role', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    const total_documents = await UserModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    if (users.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: +page,
                size: +size,
                previous: previous_pages,
                next: next_pages,
                users,
            },
            120,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            users,
        },
    });
});

module.exports = {
    GetUsers,
    UploadSingle,
    UploadMultiple,
    getUserByIdOrUsername,
    UpdateUser,
    DeleteUser,
    GetUsersByClassId,
};
