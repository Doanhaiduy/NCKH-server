const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please enter your response name'],
            trim: true,
            maxLength: [500, 'Your response name cannot exceed 50 characters'],
        },

        dataType: {
            type: String,
            required: [true, 'Please enter your response data type'],
            enum: ['text', 'file'],
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: [true, 'Please enter your response data'],
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
        toJSON: {
            virtuals: true,
        },
    }
);

responseSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const ResponseSchema = mongoose.model('Response', responseSchema);

module.exports = ResponseSchema;
