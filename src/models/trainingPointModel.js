const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

const criteriaSchema = new mongoose.Schema(
    {
        level: {
            type: Number,
            enum: [1, 2, 3, 4],
            required: true,
        },
        criteriaCode: String,
        title: String,
        description: String,
        maxScore: Number,
        totalScore: {
            // điểm trường đánh giá
            type: Number,
            default: 0,
        },
        totalScore1: {
            // điểm sinh viên tự đánh giá
            type: Number,
            default: 0,
        },
        totalScore2: {
            // điểm lớp đánh giá
            type: Number,
            default: 0,
        },
        totalScore3: {
            // điểm đơn vị đánh giá
            type: Number,
            default: 0,
        },

        evidenceType: {
            type: String,
            enum: ['file', 'text', 'none'],
            default: 'none',
        },
        evidence: {
            // validate: {
            //     validator: function (v) {
            //         if (this.evidenceType === 'none') return true;
            //         if (this.evidenceType === 'file' && v.length === 0) return false;
            //         if (this.evidenceType === 'text' && v.length === 0 && typeof v !== 'string') return false;
            //         return true;
            //     },
            //     message: 'Evidence is required',
            // },
            type: mongoose.Schema.ObjectId,
            ref: 'Response',
            default: null,
        },
        subCriteria: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'Criteria',
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

criteriaSchema.index({ _id: 1, level: 1 }, { unique: true });

criteriaSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

criteriaSchema.pre('save', async function (next) {
    if (!this.isModified('totalScore')) {
        return next();
    }
    const criteria = this;
    if (criteria.level > 1) {
        const parent = await CriteriaSchema.findOne({ subCriteria: criteria._id });
        if (parent) {
            const subCriteria = await CriteriaSchema.find({ _id: { $in: parent.subCriteria } });
            const newTotalScore = subCriteria.reduce((sum, item) => {
                if (item.id === criteria.id) {
                    return sum + criteria.totalScore;
                }
                return sum + item.totalScore;
            }, 0);
            if (newTotalScore > parent.maxScore) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'Total score must be less than or equal to max score');
            }

            parent.totalScore = newTotalScore;
            await parent.save();

            const trainingPoint = await TrainingPointSchema.findOne({ criteria: parent._id });
            if (trainingPoint) {
                const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });

                const newTrainingPointTotalScore = subCriteria.reduce((sum, item) => {
                    if (item.id === parent.id) {
                        return sum + newTotalScore;
                    }
                    return sum + item.totalScore;
                }, 0);

                trainingPoint.totalScore = newTrainingPointTotalScore;
                await trainingPoint.save();
            }
        }
    }
    next();
});

criteriaSchema.pre('remove', async function (next) {
    const criteria = this;
    if (criteria.level > 1) {
        const parent = await CriteriaSchema.findOne({ subCriteria: criteria._id });
        if (parent) {
            const subCriteria = await CriteriaSchema.find({ _id: { $in: parent.subCriteria } });
            const newTotalScore = subCriteria.reduce((sum, item) => {
                if (item.id === criteria.id) {
                    return sum - criteria.totalScore;
                }
                return sum + item.totalScore;
            }, 0);

            parent.totalScore = newTotalScore;
            await parent.save();

            const trainingPoint = await TrainingPointSchema.findOne({ criteria: parent._id });
            if (trainingPoint) {
                const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });

                const newTrainingPointTotalScore = subCriteria.reduce((sum, item) => {
                    if (item.id === parent.id) {
                        return sum + newTotalScore;
                    }
                    return sum + item.totalScore;
                }, 0);

                trainingPoint.totalScore = newTrainingPointTotalScore;
                await trainingPoint.save();
            }
        }
    }
    next();
});

criteriaSchema.pre('updateMany', async function (next) {
    next();
});

const CriteriaSchema = mongoose.model('Criteria', criteriaSchema);

const trainingPointSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        semester: {
            type: Number,
            enum: [1, 2],
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        criteria: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Criteria',
            },
        ],
        totalScore: {
            // điểm trường đánh giá
            type: Number,
            default: 0,
        },
        totalScore1: {
            // điểm sinh viên tự đánh giá
            type: Number,
            default: 0,
        },
        totalScore2: {
            // điểm lớp đánh giá
            type: Number,
            default: 0,
        },
        totalScore3: {
            // điểm đơn vị đánh giá
            type: Number,
            default: 0,
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

trainingPointSchema.index({ user: 1, semester: 1, year: 1 }, { unique: true });

trainingPointSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const TrainingPointSchema = mongoose.model('TrainingPoint', trainingPointSchema);

module.exports = {
    TrainingPointSchema,
    CriteriaSchema,
};
