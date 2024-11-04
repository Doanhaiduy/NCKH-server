const asyncHandle = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const UserSchema = require('../models/userModel');
const { TrainingPointSchema, CriteriaSchema } = require('../models/trainingPointModel');
const criteriaList = require('../mocks/criteriaList');
const mongoose = require('mongoose');
const ResponseSchema = require('../models/responseModel');
const { uploadImage, destroyImageByPublicId } = require('../utils/cloudinary');

const createCriteriaTree = async (criteriaList) => {
    const criteriaMap = {};

    for (const criteria of criteriaList) {
        const criteriaDoc = await CriteriaSchema.create({
            level: criteria.level,
            criteriaCode: criteria.criteriaCode,
            title: criteria.title,
            description: criteria.description || '',
            maxScore: criteria.maxScore,
            evidenceType: criteria.evidenceType || 'none',
        });
        criteriaMap[criteria.criteriaCode] = criteriaDoc;
    }

    for (const criteria of criteriaList) {
        if (criteria.level > 1) {
            const parentCode = criteria.criteriaCode.split('.').slice(0, -1).join('.');
            const parent = criteriaMap[parentCode];
            if (parent) {
                parent.subCriteria.push(criteriaMap[criteria.criteriaCode]._id);
                await parent.save();
            } else {
                console.error(`Parent criteria with code ${parentCode} not found.`);
            }
        }
    }

    return Object.values(criteriaMap).filter((criteria) => criteria.level === 1);
};

//[POST] /api/v1/training-point/create
const CreateTrainingPoint = asyncHandle(async (req, res) => {
    const { semester, year, userId } = req.body;
    if ([1, 2].includes(semester) === false || year === undefined) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year invalid');
    }

    // check if training point already exists
    const existingTrainingPoint = await TrainingPointSchema.findOne({
        user: userId,
        semester,
        year,
    });

    if (existingTrainingPoint) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Training point already exists');
    }

    const existingUser = await UserSchema.findById(userId);

    if (!existingUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
    }

    criteriaTree = await createCriteriaTree(criteriaList);

    // Create new training point document
    const newTrainingPoint = await TrainingPointSchema.create({
        user: userId,
        semester,
        year,
        criteria: criteriaTree.map((criteria) => criteria._id),
        status: 'pending',
    });

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: newTrainingPoint,
    });
});

//[GET] /api/v1/training-point/get-all
const GetAllTrainingPoint = asyncHandle(async (req, res) => {
    const { semester, year, userId } = req.query;

    const query = {};

    if ([1, 2].includes(Number(semester))) query.semester = semester;
    if (year) query.year = year;
    if (userId) query.user = userId;

    const trainingPoints = await TrainingPointSchema.find(query);

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints,
    });
});

//[GET] /api/v1/training-point/:id
const GetTrainingPointById = asyncHandle(async (req, res) => {
    const { id } = req.params;

    const trainingPoint = await TrainingPointSchema.findById(id)
        .select('-updatedAt -createdAt')
        .populate({
            path: 'criteria',
            select: '-updatedAt -createdAt',
            populate: {
                path: 'subCriteria',
                select: '-updatedAt -createdAt',
                populate: {
                    path: 'subCriteria',
                    select: '-updatedAt -createdAt',
                },
            },
        });

    if (!trainingPoint) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Training point not found');
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoint,
    });
});

//[GET] /api/v1/users/:id/training-points
const GetTrainingPointsByUserId = asyncHandle(async (req, res) => {
    const { semester, year } = req.query;

    if ([1, 2].includes(Number(semester)) === false || year === undefined) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year invalid');
    }

    const idOrUsername = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrUsername) ? { _id: idOrUsername } : { username: idOrUsername };

    const user = await UserSchema.findOne(query);

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const trainingPoints = await TrainingPointSchema.find({ user: user._id, semester, year })
        .populate({
            path: 'criteria',
            populate: {
                path: 'subCriteria',
                populate: {
                    path: 'subCriteria',
                    populate: {
                        path: 'evidence',
                        model: 'Response',
                        select: '_id name data',
                    },
                },
            },
        })
        .populate({
            path: 'criteria',
            populate: {
                path: 'subCriteria',
                populate: {
                    path: 'evidence',
                    model: 'Response',
                    select: '_id name data',
                },
            },
        });

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints[0],
    });
});

//[PUT] /api/v1/training-point/:id/update-status
const UpdateStatusTrainingPoint = asyncHandle(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Status invalid');
    }

    const trainingPoint = await TrainingPointSchema.findById(id);

    if (!trainingPoint) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Training point not found');
    }

    trainingPoint.status = status;
    await trainingPoint.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoint,
    });
});

//[PUT] /api/v1/training-point/:criteriaId/update-criteria-score
const UpdateCriteriaScoreTrainingPoint = asyncHandle(async (req, res) => {
    const { criteriaId } = req.params;
    const { score } = req.body;
    const criteria = await CriteriaSchema.findById(criteriaId);

    if (!criteria) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
    }

    if (criteria.subCriteria.length > 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria is not a leaf node');
    }

    if (score && score !== criteria.totalScore) {
        if (criteria.maxScore < score) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Score is greater than max score');
        }

        criteria.totalScore = score;
        await criteria.save();
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: criteria,
    });
});

//[PUT] /api/v1/training-point/update-multiple-criteria-score
const UpdateMultipleCriteriaScoreTrainingPoint = asyncHandle(async (req, res) => {
    const { criteriaScores } = req.body;

    for (const criteriaScore of criteriaScores) {
        const { criteriaId, score } = criteriaScore;
        const criteria = await CriteriaSchema.findById(criteriaId);

        if (!criteria) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
        }

        if (criteria.subCriteria.length > 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria is not a leaf node');
        }

        if (score && score !== criteria.totalScore) {
            if (criteria.maxScore < score) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'Score is greater than max score');
            }
        }

        criteria.totalScore = score;

        await criteria.save();
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: criteriaScores,
    });
});

//[PUT] /api/v1/training-point/:criteriaId/update-criteria-evidence
const UpdateCriteriaEvidenceTrainingPoint = asyncHandle(async (req, res) => {
    console.log(req.files);
    const { criteriaId } = req.params;
    const { evidence } = req.body;

    const criteria = await CriteriaSchema.findById(criteriaId);

    if (!criteria) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
    }

    if (criteria.subCriteria.length > 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria is not a leaf node');
    }

    if (criteria.evidenceType === 'none') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria does not require evidence');
    }

    if (criteria.evidence) {
        if (criteria.evidenceType === 'file') {
            const evidence = await ResponseSchema.findById(criteria.evidence);
            if (evidence) {
                for (const file of evidence.data) {
                    await destroyImageByPublicId(file.public_id);
                }
            }
        }

        await ResponseSchema.deleteOne({ _id: criteria.evidence });
        criteria.evidence = null;
    }

    if (criteria.evidenceType === 'file') {
        if (!req.files || req.files.length === 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Evidence must be a file');
        }

        let files = [];
        for (const file of req.files) {
            const upload = await uploadImage(file, 'evidence');
            files.push(upload);
        }

        const response = await ResponseSchema.create({
            name: `Minh chứng cho tiêu chí ${criteria.criteriaCode}`,
            dataType: 'file',
            data: files,
        });

        criteria.evidence = response._id;
    }

    if (criteria.evidenceType === 'text') {
        if (typeof evidence !== 'string') {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Evidence must be a string');
        }

        const response = await ResponseSchema.create({
            name: `Minh chứng cho tiêu chí ${criteria.criteriaCode}`,
            dataType: 'text',
            data: evidence,
        });
        criteria.evidence = response._id;
    }

    await criteria.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: criteria,
    });
});

//[PUT] /api/v1/training-point/:criteriaId/update-multiple-criteria-evidence

//[GET] /api/v1/training-point/:criteriaId/criteria-evidence
const GetCriteriaEvidence = asyncHandle(async (req, res) => {
    const { criteriaId } = req.params;

    const criteria = await CriteriaSchema.findById(criteriaId).populate('evidence');

    if (!criteria) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
    }

    if (criteria.evidenceType === 'none') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria does not require evidence');
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: criteria.evidence,
    });
});

module.exports = {
    CreateTrainingPoint,
    GetAllTrainingPoint,
    GetTrainingPointById,
    GetTrainingPointsByUserId,
    UpdateStatusTrainingPoint,
    UpdateCriteriaScoreTrainingPoint,
    UpdateMultipleCriteriaScoreTrainingPoint,
    UpdateCriteriaEvidenceTrainingPoint,
    GetCriteriaEvidence,
};
