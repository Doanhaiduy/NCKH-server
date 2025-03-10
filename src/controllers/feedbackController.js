const FeedbackModel = require('../models/feedbackModel');
const asyncHandler = require('express-async-handler');

// [GET] /api/v1/feedbacks
const GetFeedbacks = asyncHandler(async (req, res) => {
    let { page, size, sortDate } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let sort = {
        createdAt: -1,
    };

    if (['asc', 'desc'].includes(sortDate?.toLowerCase())) {
        sort = {
            createdAt: sortDate === 'asc' ? 1 : -1,
        };
    }

    const feedbacks = await FeedbackModel.find()
        .populate('user', 'username fullName email')
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean();

    const total_documents = await FeedbackModel.countDocuments();
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            feedbacks,
        },
    });
});

// [POST] /api/v1/feedbacks
const CreateFeedback = asyncHandler(async (req, res) => {
    const { feedback, user } = req.body;

    const newFeedback = await FeedbackModel.create({ feedback, user });

    res.status(201).json({
        status: 'success',
        data: newFeedback,
    });
});

// [GET] /api/v1/feedbacks/:id
const GetFeedbackById = asyncHandler(async (req, res) => {
    const feedback = await FeedbackModel.findById(req.params.id).populate('user', 'username fullName avatar').lean();

    res.status(200).json({
        status: 'success',
        data: feedback,
    });
});

// [DELETE] /api/v1/feedbacks/:id
const DeleteFeedback = asyncHandler(async (req, res) => {
    const feedback = await FeedbackModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status: 'success',
        data: feedback,
    });
});

module.exports = {
    GetFeedbacks,
    CreateFeedback,
    GetFeedbackById,
    DeleteFeedback,
};
