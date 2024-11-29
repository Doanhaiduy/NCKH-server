const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
    {
        feedback: {
            type: String,
            required: [true, 'Please enter your feedback'],
            trim: true,
            maxLength: [500, 'Your feedback cannot exceed 500 characters'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: { virtuals: true },
    }
);

feedbackSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const FeedbackSchema = mongoose.model('Feedback', feedbackSchema);

module.exports = FeedbackSchema;
