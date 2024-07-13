const asyncHandler = require('express-async-handler');
const PostModel = require('../models/postModel');

const GetPosts = asyncHandler(async (req, res) => {
    let { page, size } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const posts = await PostModel.find().populate('author').limit(limit).skip(skip);
    const total_documents = await PostModel.countDocuments();

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).json({
        message: 'Success',
        page: page,
        size: size,
        previous: previous_pages,
        next: next_pages,
        data: posts,
    });
});

const GetPostById = asyncHandler(async (req, res) => {
    const post = await PostModel.findById(req.params.id).populate('author');
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
    await post.save();
    res.status(201).json({ data: post });
});

module.exports = {
    GetPostById,
    CreatePost,
    GetPosts,
};
