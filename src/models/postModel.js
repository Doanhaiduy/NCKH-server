const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Please enter your post author'],
        },
        title: {
            type: String,
            required: [true, 'Please enter your post title'],
            trim: true,
            maxLength: [500, 'Your post title cannot exceed 100 characters'],
        },
        thumbnail: {
            type: String,
            default: 'https://res.cloudinary.com/dbnoomvgm/image/upload/v1719851707/NCKH/xw6ovct05dhrahgbebdc.jpg',
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
    }
);

// postSchema.index({ title: 1 }, { unique: true });

// postSchema.virtual('id').get(function () {
//     return this._id.toHexString();
// });

postSchema.set('toJSON', {
    virtuals: true,
});

const PostSchema = mongoose.model('Post', postSchema);

module.exports = PostSchema;
