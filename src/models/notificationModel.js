const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Please enter your notification sender'],
        },
        receiver: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: [true, 'Please enter your notification receiver'],
            },
        ],
        message: {
            type: String,
            required: [true, 'Please enter your notification message'],
            trim: true,
            maxLength: [500, 'Your notification message cannot exceed 100 characters'],
        },
        description: {
            type: String,
            default: '',
            trim: true,
            maxLength: [500, 'Your notification description cannot exceed 100 characters'],
        },
        type: {
            type: String,
            enum: ['system', 'reminder', 'news', 'activity', 'other', 'event', 'training-point', 'grading-period'],
            default: 'system',
        },

        readBy: [
            {
                readerId: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'User',
                    required: [true, 'Please enter your notification reader'],
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            virtuals: true,
        },
    }
);

notificationSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const NotificationSchema = mongoose.model('Notification', notificationSchema);

module.exports = NotificationSchema;
