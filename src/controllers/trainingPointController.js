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
const GradingPeriodModel = require('../models/gradingPeriodModel');
const { default: mongoose } = require('mongoose');
const { getAllUserByClass } = require('../services/userService');

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

    const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

    if (!semesterYear) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
    }

    // check if training point already exists
    const existingTrainingPoint = await TrainingPointSchema.findOne({
        user: userId,
        semesterYear: semesterYear._id,
    }).lean();

    if (existingTrainingPoint) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Training point already exists');
    }

    const existingUser = await UserSchema.findById(userId).lean();

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
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        query.semesterYear = semesterYear._id;
    }

    if (userId) query.user = userId;

    const trainingPoints = await TrainingPointSchema.find(query)
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
        .lean();

    await setCache(key, trainingPoints, 120);

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: trainingPoints,
    });
});

const getAssessmentTime = async (semesterYearId) => {
    const gradingPeriod = await GradingPeriodModel.findOne({ semesterYear: semesterYearId }).lean();

    return {
        AssessmentStartTime: gradingPeriod ? gradingPeriod.startDate : null,
        AssessmentEndTime: gradingPeriod ? gradingPeriod.endDate : null,
    };
};

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
        })
        .lean();

    if (user.typeRole === 'user' && trainingPoint.user != user.id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this resource');
    }

    if (!trainingPoint) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Training point not found');
    }
    let isLocked = true;
    const { AssessmentStartTime, AssessmentEndTime } = await getAssessmentTime(trainingPoint.semesterYear._id);

    if (AssessmentStartTime && AssessmentEndTime) {
        const currentDate = new Date();
        if (currentDate >= AssessmentStartTime && currentDate <= AssessmentEndTime) {
            isLocked = false;
        }
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            ...trainingPoint,
            isLocked,
            AssessmentStartTime,
            AssessmentEndTime,
        },
    });
});

//[GET] /api/v1/users/:id/training-points
const GetTrainingPointsByUserId = asyncHandle(async (req, res) => {
    const { semester, year, semesterYearId } = req.query;

    const queryTrainingPoint = {};
    const userReq = req.user;
    const queryUser = {};

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        queryTrainingPoint.semesterYear = semesterYear._id;
    }

    if (semesterYearId) {
        queryTrainingPoint.semesterYear = semesterYearId;
    }

    const user = await UserSchema.findById(req.params.id).lean();

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
        })
        .lean();

    let isLocked = true;
    const gradingPeriod = await GradingPeriodModel.findOne({
        semesterYear: queryTrainingPoint.semesterYear._id,
    }).lean();

    if (gradingPeriod) {
        const currentDate = new Date();
        if (currentDate >= gradingPeriod.startDate && currentDate <= gradingPeriod.endDate) {
            isLocked = false;
        }
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            ...trainingPoints[0],
            isLocked,
            AssessmentStartTime: gradingPeriod ? gradingPeriod.startDate : null,
            AssessmentEndTime: gradingPeriod ? gradingPeriod.endDate : null,
        },
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
                `Score is greater than max score of criteria ${criteria.criteriaCode}`,
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
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`,
                );
            }
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`,
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

        if (score && score > +criteria.maxScore) {
            if (+criteria.maxScore >= 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score is greater than max score of criteria ${criteria.criteriaCode}`,
                );
            } else {
                if (-criteria.maxScore < score) {
                    throw new ApiError(
                        StatusCodes.BAD_REQUEST,
                        `Score is greater than max score of criteria ${criteria.criteriaCode}`,
                    );
                }
            }
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
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`,
                );
            }
        }

        if (criteriaOneValue2.includes(criteria.criteriaCode)) {
            if (criteria.maxScore != score && score != 0) {
                throw new ApiError(
                    StatusCodes.BAD_REQUEST,
                    `Score of criteria ${criteria.criteriaCode} must be equal ${criteria.maxScore}`,
                );
            }
        }

        if (!Number(+score)) {
            criteria.tempScore = 0;
        } else {
            criteria.tempScore = score;
        }

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

    const criteria = await CriteriaSchema.findById(criteriaId).populate('evidence').lean();

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

//[PUT] /api/v1/training-point/:evidenceId/update-criteria-evidence-status
const UpdateCriteriaEvidenceStatus = asyncHandle(async (req, res) => {
    const { evidenceId } = req.params;
    const { status } = req.body;

    const evidence = await ResponseSchema.findById(evidenceId);

    if (!evidence) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Evidence not found');
    }

    if (!['approved', 'rejected'].includes(status)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Status invalid');
    }

    evidence.status = status;

    await evidence.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: evidence,
    });
});

const GetAllResponse = asyncHandle(async (req, res) => {
    const responses = await ResponseSchema.find().lean();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: responses,
    });
});

function flattenCriteria(criteriaArray) {
    let result = [];

    function extractCriteria(criteria) {
        if (criteria.evidence) {
            result.push({
                ...criteria.evidence,
                criteriaId: criteria._id,
            });
        }

        if (criteria.subCriteria && criteria.subCriteria.length > 0) {
            criteria.subCriteria.forEach(extractCriteria);
        }
    }

    criteriaArray.forEach(extractCriteria);
    return result;
}

const GetAllResponseByTrainingPoint = asyncHandle(async (req, res) => {
    const { trainingPointId } = req.params;

    const trainingPoint = await TrainingPointSchema.findById(trainingPointId)
        .populate({
            path: 'semesterYear',
            select: 'criteria',
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
                        select: '_id name data status createdAt',
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
        })
        .lean();

    if (!trainingPoint) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Training point not found');
    }

    const response = flattenCriteria(trainingPoint.criteria);

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            total: response.length,
            data: response,
        },
    });
});

const GetOverviewTrainingPointList = asyncHandle(async (req, res) => {
    let { page, size, semester, year } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;

    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};

    if (!semester) {
        semester = 1;
    }

    if (!year) {
        const currYear = new Date().getFullYear();
        year = currYear;
    }

    const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

    if (!semesterYear) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
    }

    query.semesterYear = semesterYear._id;

    const trainingPoints = await TrainingPointSchema.find(query)
        .select('user tempScore totalScore status semesterYear')
        .populate({
            path: 'user',
            select: 'name sclassName fullName',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
        .populate('semesterYear', 'semester year -_id')
        .skip(skip)
        .limit(limit)
        .lean();

    const response = trainingPoints.map((trainingPoint) => {
        return {
            user: trainingPoint.user.name,
            fullName: trainingPoint.user.fullName,
            sclassName: trainingPoint.user.sclassName.sclassName,
            idClass: trainingPoint.user.sclassName._id,
            semester: trainingPoint.semesterYear.semester,
            year: trainingPoint.semesterYear.year,
            status: trainingPoint.status,
            tempScore: trainingPoint.tempScore,
            totalScore: trainingPoint.totalScore,
        };
    });

    const groupedByClass = response.reduce((acc, curr) => {
        const className = curr.sclassName;
        if (!acc[className]) {
            acc[className] = [];
        }
        acc[className].push(curr);
        return acc;
    }, {});

    const groupedResponse = Object.keys(groupedByClass).map((className) => ({
        className,
        idClass: groupedByClass[className][0].idClass,
        total: groupedByClass[className].length,
        totalAssessment: groupedByClass[className].filter(
            (student) => student.tempScore !== 0 && student.status === 'pending',
        ).length,
        totalNoAssessment: groupedByClass[className].filter(
            (student) => student.tempScore === 0 && student.status === 'pending',
        ).length,
        totalApprove: groupedByClass[className].filter((student) => student.status !== 'pending').length,
        // students: groupedByClass[className],
    }));

    const { AssessmentStartTime, AssessmentEndTime } = await getAssessmentTime(query.semesterYear);

    const total_documents = await TrainingPointSchema.countDocuments(query);
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            data: {
                assessmentStartTime: AssessmentStartTime,
                assessmentEndTime: AssessmentEndTime,
                trainingPoints: groupedResponse,
            },
        },
    });
});

const GetTrainingPointByClass = asyncHandle(async (req, res) => {
    let { semester, year, page, size } = req.query;
    const { classId } = req.params;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }
        query.semesterYear = semesterYear._id;
    } else {
        const currYear = new Date().getFullYear();
        const currMonth = new Date().getMonth() + 1;
        let semester = 1;
        if (currMonth > 6) {
            semester = 2;
        }
        const semesterYear = await SemesterYearModel.findOne({ semester, year: currYear }).lean();
        query.semesterYear = semesterYear._id;
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Class id is invalid');
    }

    let userIdArr = [];

    if (classId) {
        userIdArr = await getAllUserByClass(classId);
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'classId is required');
    }

    if (userIdArr.length !== 0) {
        query.user = { $in: userIdArr };
    }

    const trainingPoints = await TrainingPointSchema.find(query)
        .select('user tempScore totalScore status')
        .populate({ path: 'semesterYear', select: '-updatedAt -createdAt' })
        .populate({
            path: 'user',
            select: 'name fullName sclassName username',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
        .skip(skip)
        .limit(limit)
        .lean();

    const response = trainingPoints.map((trainingPoint) => {
        return {
            _id: trainingPoint._id,
            username: trainingPoint.user.username,
            fullName: trainingPoint.user.fullName,
            status: trainingPoint.status,
            tempScore: trainingPoint.tempScore,
            totalScore: trainingPoint.totalScore,
        };
    });

    const { AssessmentStartTime, AssessmentEndTime } = await getAssessmentTime(query.semesterYear);

    const total_documents = await TrainingPointSchema.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            sclassName: trainingPoints[0].user.sclassName.sclassName,
            year: trainingPoints[0].semesterYear.year,
            semester: trainingPoints[0].semesterYear.semester,
            assessmentStartTime: AssessmentStartTime,
            assessmentEndTime: AssessmentEndTime,
            data: response,
        },
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
    UpdateCriteriaEvidenceStatus,
    GetAllResponse,
    GetAllResponseByTrainingPoint,
    GetOverviewTrainingPointList,
    GetTrainingPointByClass,
    getAssessmentTime,
};
