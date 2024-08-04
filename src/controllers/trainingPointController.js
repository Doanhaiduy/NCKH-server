const asyncHandle = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const UserSchema = require('../models/userModel');
const { TrainingPointSchema, CriteriaSchema } = require('../models/trainingPointModel');
const criteriaList = require('../mocks/criteriaList');
const mongoose = require('mongoose');
const { patch } = require('../routes/userRouter');

// [POST] /api/v1/training-point/create
const createCriteriaTree = async (criteriaList) => {
    console.log('Creating criteria tree...');
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

    console.log('criteriaMap:', criteriaMap);

    for (const criteria of criteriaList) {
        if (criteria.level > 1) {
            const parentCode = criteria.criteriaCode.split('.').slice(0, -1).join('.');
            console.log('parentCode:', parentCode);
            const parent = criteriaMap[parentCode];
            console.log('parent:', parent);
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

// [POST] /api/v1/training-pocint/create
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

// [GET] /api/v1/training-point/get-all
const GetAllTrainingPoint = asyncHandle(async (req, res) => {
    const trainingPoints = await TrainingPointSchema.find().populate('criteria');

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints,
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

    const trainingPoints = await TrainingPointSchema.find({ user: user._id, semester, year }).populate({
        path: 'criteria',
        populate: {
            path: 'subCriteria',
            populate: {
                path: 'subCriteria',
            },
        },
    });

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints[0],
    });
});

// [PUT] /api/v1/training-point/:id/update

const UpdateTrainingPoint = asyncHandle(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

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
module.exports = {
    CreateTrainingPoint,
    GetAllTrainingPoint,
    GetTrainingPointsByUserId,
    UpdateTrainingPoint,
};
