const asyncHandler = require('express-async-handler');
const PostModel = require('../models/postModel');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// [GET] /api/v1/posts/get-all
const GetPosts = asyncHandler(async (req, res) => {
    let { page, size, category, time, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};
    const currentDate = new Date();

    if (['news', 'activity'].includes(category)) {
        query.category = category;
    }

    if (search) {
        query.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
    }
    const posts = await PostModel.find(query)
        .select('-content -status  -updatedAt -__v')
        .populate('author', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

    const total_documents = await PostModel.countDocuments(query);

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
            posts,
        },
    });
});

// [GET] /api/v1/posts/:id
const GetPostById = asyncHandler(async (req, res) => {
    const post = await PostModel.findById(req.params.id).select('-updatedAt -__v').populate('author', 'fullName email');
    if (!post) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
    }
    res.status(200).json({
        status: 'success',
        data: post,
    });
});

// [POST] /api/v1/posts/create
const CreatePost = asyncHandler(async (req, res) => {
    const post = new PostModel({
        author: req.body.author,
        title: req.body.title,
        content: req.body.content,
    });
    // if (req.body.posts) {
    //     const posts = req.body.posts;
    //     const newPosts = posts.map((post) => {
    //         console.log(post);
    //         return new PostModel(post);
    //     });
    //     await PostModel.insertMany(newPosts);
    // }
    await post.save();
    res.status(201).json({
        status: 'success',
        data: post,
    });
});

// [PUT] /api/v1/posts/update/:id
const UpdatePost = asyncHandler(async (req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post id');
    }

    const post = await PostModel.findById(req.params.id);

    if (post) {
        post.title = title || post.title;
        post.content = content || post.content;

        const updatedPost = await post.save();
        res.status(200).json({
            status: 'success',
            data: updatedPost,
        });
    } else {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
    }
});

// [DELETE] /api/v1/posts/:id
const DeletePost = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post id');
    }

    const post = await PostModel.findById(req.params.id);

    if (!post) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
    }

    await post.deleteOne();

    res.status(200).json({
        status: 'success',
        data: null,
    });
});

module.exports = {
    GetPostById,
    CreatePost,
    GetPosts,
    UpdatePost,
    DeletePost,
};
