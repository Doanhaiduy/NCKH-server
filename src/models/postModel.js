const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Please enter your post author'],
        },
        event: {
            type: mongoose.Schema.ObjectId,
            ref: 'Event',
        },
        title: {
            type: String,
            required: [true, 'Please enter your post title'],
            trim: true,
            maxLength: [500, 'Your post title cannot exceed 100 characters'],
        },
        thumbnail: {
            type: String,
            default:
                'https://img.freepik.com/free-vector/abstract-coming-soon-halftone-style-background-design_1017-27282.jpg?semt=ais_hybrid',
        },
        content: {
            type: String,
            required: [true, 'Please enter your post content'],
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
        type: {
            type: String,
            enum: ['news', 'activity'],
            default: 'activity',
        },
        category: {
            type: String,
            enum: ['news', 'activity'],
            default: 'activity',
        },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            virtuals: true,
        },
    }
);

postSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const PostSchema = mongoose.model('Post', postSchema);

module.exports = PostSchema;
