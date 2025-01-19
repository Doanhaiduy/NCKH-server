const FeedbackModel = require('../models/feedbackModel');
const asyncHandler = require('express-async-handler');

// [GET] /api/v1/feedbacks
const GetFeedbacks = asyncHandler(async (req, res) => {
    const feedbacks = await FeedbackModel.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
        status: 'success',
        data: feedbacks,
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
    const feedback = await FeedbackModel.findById(req.params.id).lean();

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
