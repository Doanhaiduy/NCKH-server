const asyncHandle = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const UserSchema = require('../models/userModel');
const SemesterYearModel = require('../models/semesterYearModel');
const { TrainingPointSchema, CriteriaSchema } = require('../models/trainingPointModel');
const criteriaList = require('../mocks/criteriaList');
const ResponseSchema = require('../models/responseModel');
const { destroyImageByPublicId, upLoadMultipleImages } = require('../utils/cloudinary');
const { handleCache, setCache } = require('../configs/redis');

const getIdCriteria = async (criteriaCode, idUser, semesterYearId) => {
    const trainingPoint = await TrainingPointSchema.findOne({ user: idUser, semesterYear: semesterYearId });
    if (!trainingPoint) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Training point not found');
    }

    const criteriaList = await CriteriaSchema.find({ criteriaCode }).select('_id parent');

    if (!criteriaList) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
    }

    for (const criteria of criteriaList) {
        if (trainingPoint.criteria.includes(criteria._id)) {
            return criteria._id;
        }

        if (criteria.parent) {
            if (trainingPoint.criteria.includes(criteria.parent)) {
                return criteria._id;
            }

            const parent = await CriteriaSchema.findById(criteria.parent);
            if (parent.parent) {
                if (trainingPoint.criteria.includes(parent.parent)) {
                    return criteria._id;
                }
            }

            if (parent.parent) {
                const parentParent = await CriteriaSchema.findById(parent.parent);
                if (parentParent.parent) {
                    if (trainingPoint.criteria.includes(parentParent.parent)) {
                        return criteria._id;
                    }
                }
            }
        }
    }

    return null;
};

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
            isAutoScore: criteria.isAutoScore || false,
        });

        criteriaMap[criteria.criteriaCode] = criteriaDoc;

        if (criteria.level > 1) {
            const parentCode = criteria.criteriaCode.split('.').slice(0, -1).join('.');
            criteriaDoc.parent = criteriaMap[parentCode]._id;
            await criteriaDoc.save();
        }

        if (criteria.level === 1) {
            criteriaDoc.parent = null;
            await criteriaDoc.save();
        }
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

    const semesterYear = await SemesterYearModel.findOne({ semester, year });

    if (!semesterYear) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
    }

    // check if training point already exists
    const existingTrainingPoint = await TrainingPointSchema.findOne({
        user: userId,
        semesterYear: semesterYear._id,
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
        semesterYear: semesterYear._id,
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

    const key = `TrainingPoint_${semester}_${year}_${userId}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(StatusCodes.OK).json({
            status: 'success',
            data: value,
        });
    }

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year });

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        query.semesterYear = semesterYear._id;
    }

    if (userId) query.user = userId;

    const trainingPoints = await TrainingPointSchema.find(query).populate({
        path: 'semesterYear',
        select: '-updatedAt -createdAt',
    });

    await setCache(key, trainingPoints, 900);

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints,
    });
});

//[GET] /api/v1/training-point/:id
const GetTrainingPointById = asyncHandle(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const trainingPoint = await TrainingPointSchema.findById(id)
        .select('-updatedAt -createdAt')
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
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

    if (user.typeRole === 'user' && trainingPoint.user != user.id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this resource');
    }

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
    const { semester, year, semesterYearId } = req.query;

    const queryTrainingPoint = {};
    const userReq = req.user;
    const queryUser = {};

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year });

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        queryTrainingPoint.semesterYear = semesterYear._id;
    }

    if (semesterYearId) {
        queryTrainingPoint.semesterYear = semesterYearId;
    }

    const user = await UserSchema.findById(req.params.id);

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (userReq.typeRole === 'user' && user._id != userReq.id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this resource');
    }

    queryTrainingPoint.user = user._id;

    const trainingPoints = await TrainingPointSchema.find(queryTrainingPoint)
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
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

const updateCriteriaScore = async (criteriaId, scorePlus) => {
    const criteria = await CriteriaSchema.findById(criteriaId);

    if (!criteria) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
    }

    if (criteria.totalScore + scorePlus > criteria.maxScore) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Score is greater than max score of criteria');
    }

    criteria.totalScore += scorePlus;
    await criteria.save({ runCustomPreSave: true, isTemplateScore: false });
};

//[PUT] /api/v1/training-point/update-criteria-score
const UpdateCriteriaScore = asyncHandle(async (req, res) => {
    const { criteriaScores } = req.body;
    const criteriaOneValue = ['1.1.1', '1.1.2', '1.1.3', '1.1.4'];
    const criteriaOneValue2 = ['1.3.1', '1.3.2', '1.3.3', '1.3.4'];

    let criteriaArray = [];
    let criteriaCheck = [];
    let criteriaCheck2 = [];

    function hasDuplicateCriteria(criteriaArray) {
        const idSet = new Set();

        for (const criteria of criteriaArray) {
            if (idSet.has(criteria.criteriaId)) {
                return true;
            }
            idSet.add(criteria.criteriaId);
        }
        return false;
    }

    if (hasDuplicateCriteria(criteriaScores)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Duplicate criteria in request');
    }

    for (const criteriaScore of criteriaScores) {
        const { criteriaId, score } = criteriaScore;
        const criteria = await CriteriaSchema.findById(criteriaId);

        if (!criteria) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
        }

        if (criteria.subCriteria.length > 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria is not a leaf node');
        }

        if (score && score > criteria.maxScore) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Score is greater than max score of criteria ${criteria.criteriaCode}`
            );
        }

        if (criteriaOneValue.includes(criteria.criteriaCode) && score != 0) {
            criteriaCheck.push(criteria);
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode) && score != 0) {
            criteriaCheck2.push(criteria);
        }

        // 1.1 => 1.1.1, 1.1.2, 1.1.3, 1.1.4 => has 1 value in 4 criteria, if 1.1.1 has value => 1.1.2, 1.1.3, 1.1.4 don't have value

        if (criteriaScore.score !== criteria.totalScore) {
            criteriaArray.push(criteria);
        }
    }

    if (criteriaCheck.length > 1) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only one criteria in 1.1 can have value');
    }

    if (criteriaCheck2.length > 1) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only one criteria in 1.3 can have value');
    }

    criteriaArray = criteriaArray.sort((a, b) => a.criteriaCode.localeCompare(b.criteriaCode));

    for (const criteria of criteriaArray) {
        const { criteriaId, score } = criteriaScores.find((criteriaScore) => criteriaScore.criteriaId === criteria.id);

        if (criteriaOneValue.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`
                );
            }
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`
                );
            }
        }
        criteria.totalScore = score;
        await criteria.save({ runCustomPreSave: true, isTemplateScore: false });
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            message: 'Update multiple criteria score successfully',
        },
    });
});

//[PUT] /api/v1/training-point/:criteriaId/update-criteria-score-temp
const UpdateCriteriaScoreTemp = asyncHandle(async (req, res) => {
    const { criteriaScores } = req.body;
    const criteriaOneValue = ['1.1.1', '1.1.2', '1.1.3', '1.1.4'];
    const criteriaOneValue2 = ['1.3.1', '1.3.2', '1.3.3', '1.3.4'];

    let criteriaArray = [];
    let criteriaCheck = [];
    let criteriaCheck2 = [];

    function hasDuplicateCriteria(criteriaArray) {
        const idSet = new Set();

        for (const criteria of criteriaArray) {
            if (idSet.has(criteria.criteriaId)) {
                return true;
            }
            idSet.add(criteria.criteriaId);
        }
        return false;
    }

    if (hasDuplicateCriteria(criteriaScores)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Duplicate criteria in request');
    }

    for (const criteriaScore of criteriaScores) {
        const { criteriaId, score } = criteriaScore;
        const criteria = await CriteriaSchema.findById(criteriaId);

        if (!criteria) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Criteria not found');
        }

        if (criteria.subCriteria.length > 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria is not a leaf node');
        }

        if (score && score > criteria.maxScore) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Score is greater than max score of criteria ${criteria.criteriaCode}`
            );
        }

        if (criteriaOneValue.includes(criteria.criteriaCode) && score != 0) {
            criteriaCheck.push(criteria);
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode) && score != 0) {
            criteriaCheck2.push(criteria);
        }

        if (criteriaScore.score !== criteria.tempScore) {
            criteriaArray.push(criteria);
        }
    }

    if (criteriaCheck.length > 1) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only one criteria in 1.1 can have value');
    }

    if (criteriaCheck2.length > 1) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Only one criteria in 1.3 can have value');
    }

    criteriaArray = criteriaArray.sort((a, b) => a.criteriaCode.localeCompare(b.criteriaCode));

    for (const criteria of criteriaArray) {
        const { criteriaId, score } = criteriaScores.find((criteriaScore) => criteriaScore.criteriaId === criteria.id);

        if (criteriaOneValue.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`
                );
            }
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`
                );
            }
        }
        criteria.tempScore = score;
        await criteria.save({
            runCustomPreSave: true,
            isTemplateScore: true,
        });
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            message: 'Update multiple criteria temp score successfully',
        },
    });
});

//[PUT] /api/v1/training-point/:criteriaId/update-criteria-evidence
const UpdateCriteriaEvidence = asyncHandle(async (req, res) => {
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

        // for (const file of req.files) {
        // const upload = await uploadImage(file, 'evidence');
        // files.push(upload);
        const files = await upLoadMultipleImages(req.files, 'evidence');
        // }

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

//[GET] /api/v1/training-point/:criteriaId/criteria-evidence
const GetCriteriaEvidence = asyncHandle(async (req, res) => {
    const { criteriaId } = req.params;
    const user = req.user;

    const criteria = await CriteriaSchema.findById(criteriaId).populate('evidence');
    if (user.typeRole === 'user' && criteria.user != user.id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this resource');
    }

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
    getIdCriteria,
    CreateTrainingPoint,
    GetAllTrainingPoint,
    GetTrainingPointById,
    GetTrainingPointsByUserId,
    UpdateStatusTrainingPoint,
    UpdateCriteriaScoreTemp,
    UpdateCriteriaScore,
    UpdateCriteriaEvidence,
    GetCriteriaEvidence,
    updateCriteriaScore,
};
