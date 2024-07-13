const mongoose = require('mongoose');

const trainingPointSchema = new mongoose.Schema(
    {
        trainingPointCode: {
            type: String,
            required: [true, 'Please enter your training point code'],
            trim: true,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Please enter your user'],
        },
        semester: {
            type: String,
            required: [true, 'Please enter your semester'],
        },

        year: {
            type: String,
            required: [true, 'Please enter your year'],
        },
        criteria: [
            {
                code: String,
                title: String,
                maxScore: Number,
                userScore: {
                    type: Number,
                    default: 0,
                },
                subCriteria: [
                    {
                        code: String,
                        title: String,
                        maxScore: Number,
                        evidenceType: {
                            enum: ['file', 'text', 'none'],
                            default: 'none',
                        },
                        evidence: {
                            type: [mongoose.Schema.ObjectId],
                            ref: 'Response',
                        },

                        userScore: {
                            type: Number,
                            default: 0,
                        },
                        subSubCriteria: [
                            {
                                code: String,
                                title: String,
                                maxScore: Number,
                                evidence: {
                                    type: [mongoose.Schema.ObjectId],
                                    ref: 'Response',
                                },
                                userScore: {
                                    type: Number,
                                    default: 0,
                                },
                            },
                        ],
                    },
                ],
            },
        ],
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
    },

    {
        timestamps: true,
    }
);

trainingPointSchema.index({ user: 1, level: 1 }, { unique: true });

trainingPointSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

trainingPointSchema.set('toJSON', {
    virtuals: true,
});

const TrainingPointSchema = mongoose.model('TrainingPoint', trainingPointSchema);

module.exports = TrainingPointSchema;
