const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please enter your status name'],
            trim: true,
            maxLength: [50, 'Your status name cannot exceed 50 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please enter your status description'],
            trim: true,
            maxLength: [500, 'Your status description cannot exceed 500 characters'],
        },
    },
    {
        timestamps: true,
    }
);

statusSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

statusSchema.set('toJSON', {
    virtuals: true,
});

const StatusSchema = mongoose.model('Status', statusSchema);

module.exports = StatusSchema;
