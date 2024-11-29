const mongoose = require('mongoose');
const semesterYearSchema = new mongoose.Schema(
    {
        semester: {
            type: Number,
            enum: [1, 2],
            required: true,
        },
        year: {
            type: Number,
            required: true,
            default: new Date().getFullYear(),
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

semesterYearSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const SemesterYear = mongoose.model('SemesterYear', semesterYearSchema);

module.exports = SemesterYear;
