const asyncHandler = require('express-async-handler');
const PostModel = require('../models/postModel');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { default: mongoose } = require('mongoose');

const ViewPostById = asyncHandler(async (req, res) => {
    let query = {
        status: 'published',
    };
    if (!req.params.id) {
        return res.status(StatusCodes.BAD_REQUEST).send(new ApiError('Post id is required'));
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        query.slug = req.params.id;
    } else {
        query._id = req.params.id;
    }

    const post = await PostModel.findOne(query)
        .select('-updatedAt -__v')
        .populate('author', 'fullName email avatar username')
        .lean();

    const newPosts = await PostModel.find({}).select('-updatedAt -__v').sort({ createdAt: -1 }).limit(4).lean();

    if (!post) {
        return res.status(StatusCodes.NOT_FOUND).send(new ApiError('Post not found'));
    }

    const optionsDate = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };

    const optionsTime = {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    };

    post.createdAt =
        new Date(post.createdAt).toLocaleDateString('vi-VN', optionsDate) +
        ' - ' +
        new Date(post.createdAt).toLocaleTimeString('vi-VN', optionsTime);

    res.render('postDetails', {
        post,
        newPosts,
    });
});
module.exports = {
    ViewPostById,
};
