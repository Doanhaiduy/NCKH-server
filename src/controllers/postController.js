const asyncHandler = require('express-async-handler');
const PostModel = require('../models/postModel');
const EventModel = require('../models/eventModel');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { handleCache, setCache } = require('../configs/redis');

// [GET] /api/v1/posts/get-all
const GetPosts = asyncHandler(async (req, res) => {
    let { page, size, category, time, search, status } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const user = req.user;
    const query = {};
    const currentDate = new Date();

    const key = `posts_${page ? page : ''}_${size ? size : ''}_${category ? category : ''}_${search ? search : ''}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    if (['news', 'activity'].includes(category)) {
        query.category = category;
    }

    if (search) {
        query.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
    }

    query.status = status ? status : 'published';

    if (user.typeRole === 'user') {
        query.status = 'published';
    }
    console.log(query);

    const posts = await PostModel.find(query)
        .select('-content -status  -updatedAt -__v')
        .populate('author', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    const total_documents = await PostModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    if (posts.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: page,
                size: size,
                previous: previous_pages,
                next: next_pages,
                posts,
            },
            900
        );
    }

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
    const user = req.user;
    const post = await PostModel.findById(req.params.id).select('-updatedAt -__v').lean();
    let typeAction = 'none';
    if (user.typeRole === 'user') {
        if (post.status === 'draft') {
            throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to view this post');
        }

        if (post.type === 'activity') {
            const event = await EventModel.findOne({ post: post._id })
                .select('registeredAttendees attendeesList semesterYear')
                .populate('attendeesList', 'user')
                .populate('semesterYear');

            if (event && event.startAt > new Date()) {
                const register = event.registeredAttendees.find(
                    (attendee) => attendee.toString() === user.id.toString()
                );
                if (!register) {
                    typeAction = 'register';
                } else {
                    typeAction = 'unregister';
                }

                if (event.registeredAttendees.length === event.semesterYear.maxAttendees) {
                    typeAction = 'full';
                }

                const currentTime = new Date().getTime();
                const eventStartTime = new Date(event.startAt).getTime();
                const timeUntilEvent = eventStartTime - currentTime;
                if (timeUntilEvent <= 30 * 60 * 1000) {
                    typeAction = 'expired';
                }

                const attendee = event.attendeesList.find((attendee) => {
                    return attendee.user.toString() === user.id.toString();
                });
                if (attendee) {
                    typeAction = 'already';
                }
            }
        }
    }

    if (!post) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
    }
    res.status(200).json({
        status: 'success',
        data: {
            ...post,
            typeAction,
        },
    });
});

// [POST] /api/v1/posts/create
const CreatePost = asyncHandler(async (req, res) => {
    const post = new PostModel({
        author: req.body.author,
        title: req.body.title,
        content: req.body.content,
        thumbnail: req.body.thumbnail,
        status: req.body.status,
        type: req.body.type,
        category: req.body.category,
    });

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
