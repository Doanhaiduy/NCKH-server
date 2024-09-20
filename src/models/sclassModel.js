const mongoose = require('mongoose');

const sclassSchema = new mongoose.Schema(
    {
        sclassName: {
            type: String,
            required: [true, 'Please enter class name'],
            trim: true,
            maxLength: [50, 'Your class name cannot exceed 50 characters'],
            unique: true,
        },
        teacher: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
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

sclassSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const sClassSchema = mongoose.model('Class', sclassSchema);
module.exports = sClassSchema;
