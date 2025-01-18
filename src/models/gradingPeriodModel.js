const mongoose = require('mongoose');
const gradingPeriodSchema = new mongoose.Schema(
    {
        semesterYear: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
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

gradingPeriodSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const GradingPeriod = mongoose.model('GradingPeriod', gradingPeriodSchema);

module.exports = GradingPeriod;
