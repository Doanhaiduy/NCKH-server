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
        criteriaCode: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: String,
        maxScore: {
            type: String,
            required: true,
        },
        totalScore: {
            type: Number,
            default: 0,
        },

        tempScore: {
            type: Number,
            default: 0,
        },
        isAutoScore: {
            type: Boolean,
            default: false,
        },
        evidenceType: {
            type: String,
            enum: ['file', 'text', 'none'],
            default: 'none',
        },
        evidence: {
            type: mongoose.Schema.ObjectId,
            ref: 'Response',
            default: null,
        },
        parent: {
            type: mongoose.Schema.ObjectId,
            ref: 'Criteria',
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

criteriaSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

criteriaSchema.pre('save', async function (next) {
    if (!this.$__.saveOptions.runCustomPreSave) {
        return next();
    }
    const isTemplateScore = this.$__.saveOptions.isTemplateScore;

    if (isTemplateScore) {
        if (this.level > 1) {
            let parent = await CriteriaSchema.findById(this.parent);
            let grandParent = await CriteriaSchema.findById(parent?.parent);
            let trainingPoint = await TrainingPointSchema.findOne({ criteria: grandParent?._id });

            if (parent) {
                const subCriteria = await CriteriaSchema.find({ parent: this.parent });

                let newTempScore = subCriteria.reduce((sum, item) => {
                    if (item.id === this.id) {
                        return sum + this.tempScore;
                    }
                    return sum + item.tempScore;
                }, 0);

                if (parent.criteriaCode === '1.1' && this.tempScore !== 0) {
                    newTempScore = this.tempScore;
                }

                if (parent.criteriaCode === '1.3' && this.tempScore !== 0) {
                    newTempScore = this.tempScore;
                }

                if (newTempScore > parent.maxScore) {
                    if (parent.criteriaCode === '1.2') {
                        parent.tempScore = parent.maxScore;
                        newTempScore = parent.maxScore;
                    } else {
                        throw new ApiError(
                            StatusCodes.BAD_REQUEST,
                            `Total score must be less than or equal to max score : ${parent.criteriaCode} : ${parent.maxScore}`
                        );
                    }
                } else {
                    parent.tempScore = newTempScore;
                }

                if (grandParent) {
                    const subCriteria = await CriteriaSchema.find({ parent: grandParent._id });
                    const newGrandParentTempScore = subCriteria.reduce((sum, item) => {
                        if (item.id === parent.id) {
                            return sum + +newTempScore;
                        }
                        return sum + item.tempScore;
                    }, 0);

                    console.log({ newGrandParentTempScore, maxScore: grandParent.maxScore });

                    if (newGrandParentTempScore > grandParent.maxScore) {
                        throw new ApiError(
                            StatusCodes.BAD_REQUEST,
                            `Total score must be less than or equal to max score: ${grandParent.criteriaCode} : ${grandParent.maxScore} , ${newGrandParentTempScore}`
                        );
                    }
                    grandParent.tempScore = newGrandParentTempScore;

                    if (trainingPoint) {
                        const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });
                        const newTrainingPointTempScore = subCriteria.reduce((sum, item) => {
                            if (item.id === grandParent.id) {
                                return sum + newGrandParentTempScore;
                            }
                            return sum + item.tempScore;
                        }, 0);

                        trainingPoint.tempScore = newTrainingPointTempScore;
                    }
                } else {
                    trainingPoint = await TrainingPointSchema.findOne({ criteria: parent._id });
                    if (trainingPoint) {
                        const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });
                        const newTrainingPointTempScore = subCriteria.reduce((sum, item) => {
                            if (item.id === parent.id) {
                                return sum + newTempScore;
                            }
                            return sum + item.tempScore;
                        }, 0);

                        trainingPoint.tempScore = newTrainingPointTempScore;
                    }
                }
            }
            if (parent) {
                await parent.save({ runCustomPreSave: false });
            }
            if (grandParent) {
                await grandParent.save({ runCustomPreSave: false });
            }
            if (trainingPoint) {
                await trainingPoint.save({ runCustomPreSave: false });
            }
        }
    } else {
        if (this.level > 1) {
            let parent = await CriteriaSchema.findById(this.parent);
            let grandParent = await CriteriaSchema.findById(parent?.parent);
            let trainingPoint = await TrainingPointSchema.findOne({ criteria: grandParent?._id });

            if (parent) {
                const subCriteria = await CriteriaSchema.find({ parent: this.parent });

                let newTotalScore = subCriteria.reduce((sum, item) => {
                    if (item.id === this.id) {
                        return sum + this.totalScore;
                    }
                    return sum + item.totalScore;
                }, 0);

                if (parent.criteriaCode === '1.1' && this.totalScore !== 0) {
                    newTotalScore = this.totalScore;
                }

                if (parent.criteriaCode === '1.3' && this.totalScore !== 0) {
                    newTotalScore = this.totalScore;
                }

                if (newTotalScore > parent.maxScore) {
                    if (parent.criteriaCode === '1.2') {
                        parent.totalScore = parent.maxScore;
                        newTotalScore = parent.maxScore;
                    } else {
                        throw new ApiError(
                            StatusCodes.BAD_REQUEST,
                            `Total score must be less than or equal to max score : ${parent.criteriaCode} : ${parent.maxScore}`
                        );
                    }
                } else {
                    parent.totalScore = newTotalScore;
                }

                if (grandParent) {
                    const subCriteria = await CriteriaSchema.find({ parent: grandParent._id });
                    const newGrandParentTotalScore = subCriteria.reduce((sum, item) => {
                        if (item.id === parent.id) {
                            return sum + +newTotalScore;
                        }
                        return sum + item.totalScore;
                    }, 0);

                    console.log({ newGrandParentTotalScore, maxScore: grandParent.maxScore });

                    if (newGrandParentTotalScore > grandParent.maxScore) {
                        throw new ApiError(
                            StatusCodes.BAD_REQUEST,
                            `Total score must be less than or equal to max score : ${grandParent.criteriaCode} : ${grandParent.maxScore} , ${newGrandParentTotalScore}`
                        );
                    }
                    grandParent.totalScore = newGrandParentTotalScore;

                    if (trainingPoint) {
                        const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });
                        const newTrainingPointTotalScore = subCriteria.reduce((sum, item) => {
                            if (item.id === grandParent.id) {
                                return sum + newGrandParentTotalScore;
                            }
                            return sum + item.totalScore;
                        }, 0);

                        trainingPoint.totalScore = newTrainingPointTotalScore;
                    }
                } else {
                    trainingPoint = await TrainingPointSchema.findOne({ criteria: parent._id });
                    if (trainingPoint) {
                        const subCriteria = await CriteriaSchema.find({ _id: { $in: trainingPoint.criteria } });
                        const newTrainingPointTotalScore = subCriteria.reduce((sum, item) => {
                            if (item.id === parent.id) {
                                return sum + newTotalScore;
                            }
                            return sum + item.totalScore;
                        }, 0);

                        trainingPoint.totalScore = newTrainingPointTotalScore;
                    }
                }
            }
            if (parent) {
                await parent.save({ runCustomPreSave: false });
            }
            if (grandParent) {
                await grandParent.save({ runCustomPreSave: false });
            }
            if (trainingPoint) {
                await trainingPoint.save({ runCustomPreSave: false });
            }
        }
    }
    next();
});

criteriaSchema.pre('remove', async function (next) {
    const criteria = this;
    if (criteria.level > 1) {
        const parent = await CriteriaSchema.findOne({ subCriteria: criteria.parent });
        if (parent) {
            const subCriteria = await CriteriaSchema.find({ _id: { $in: parent.subCriteria } });
            const newTotalScore = subCriteria.reduce((sum, item) => {
                if (item.id === criteria.id) {
                    return sum - criteria.totalScore;
                }
                return sum + item.totalScore;
            }, 0);
            const newTempScore = subCriteria.reduce((sum, item) => {
                if (item.id === criteria.id) {
                    return sum - criteria.tempScore;
                }
                return sum + item.tempScore;
            }, 0);

            parent.totalScore = newTotalScore;
            parent.tempScore = newTempScore;

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
        semesterYear: {
            type: mongoose.Schema.ObjectId,
            ref: 'SemesterYear',
            required: true,
        },

        criteria: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Criteria',
            },
        ],
        totalScore: {
            type: Number,
            default: 0,
        },
        tempScore: {
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

trainingPointSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const TrainingPointSchema = mongoose.model('TrainingPoint', trainingPointSchema);

module.exports = {
    TrainingPointSchema,
    CriteriaSchema,
};
