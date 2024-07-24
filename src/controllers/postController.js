const asyncHandler = require('express-async-handler');
const PostModel = require('../models/postModel');

const GetPosts = asyncHandler(async (req, res) => {
    let { page, size, category, time } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};
    const currentDate = new Date();

    if (category === 'news' || category === 'activity') {
        query.category = category;
    }

    // if (time === 'past') {
    //     query.endDate = { $lt: currentDate };
    // } else if (time === 'ongoing') {
    //     query.startDate = { $lte: currentDate };
    //     query.endDate = { $gte: currentDate };
    // } else if (time === 'upcoming') {
    //     query.startDate = { $gt: currentDate };
    // }

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
        message: 'Success',
        total: total_documents,
        page: page,
        size: size,
        previous: previous_pages,
        next: next_pages,
        data: posts,
    });
});

const GetPostById = asyncHandler(async (req, res) => {
    const post = await PostModel.findById(req.params.id).select('-updatedAt -__v').populate('author', 'fullName email');
    if (!post) {
        res.status(404);
        throw new Error('Post not found');
    }
    res.status(200).json({ data: post });
});

const CreatePost = asyncHandler(async (req, res) => {
    if (!req.body.title || !req.body.content || !req.body.author) {
        res.status(400);
        throw new Error('Title and content are required');
    }

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
    res.status(201).json({ data: post });
});

const createMultiplePosts = asyncHandler(async (req, res) => {
    0;
});

module.exports = {
    GetPostById,
    CreatePost,
    GetPosts,
};
