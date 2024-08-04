const mongoose = require('mongoose');

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
        totalScore: { type: Number, default: 0 },
        evidenceType: {
            type: String,
            enum: ['file', 'text', 'none'],
            default: 'none',
        },
        evidence: {
            type: [mongoose.Schema.ObjectId],
            ref: 'Response',
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
    }
);

criteriaSchema.index({ _id: 1, level: 1 }, { unique: true });

criteriaSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

criteriaSchema.set('toJSON', {
    virtuals: true,
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
        status: String,
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

trainingPointSchema.index({ user: 1, semester: 1, year: 1 }, { unique: true });

trainingPointSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

trainingPointSchema.set('toJSON', {
    virtuals: true,
});

const TrainingPointSchema = mongoose.model('TrainingPoint', trainingPointSchema);

module.exports = {
    TrainingPointSchema,
    CriteriaSchema,
};
