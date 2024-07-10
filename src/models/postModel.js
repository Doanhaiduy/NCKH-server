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
            maxLength: [100, 'Your post title cannot exceed 100 characters'],
        },
        content: {
            type: Object,
            required: [true, 'Please enter your post content'],
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
    },
    {
        timestamps: true,
    }
);

postSchema.index({ author: 1, title: 1 }, { unique: true });

postSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

postSchema.set('toJSON', {
    virtuals: true,
});

const PostSchema = mongoose.model('Post', postSchema);

module.exports = PostSchema;
