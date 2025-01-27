const SemesterYearModel = require('../models/semesterYearModel');
const asyncHandler = require('express-async-handler');
const GradingPeriodModel = require('../models/gradingPeriodModel');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { scheduleTrainingPointGradeNotifications } = require('../utils/scheduleJob');
const { getAllUserIds } = require('../services/userService');

// [GET] /api/v1/semester-years
const GetSemesterYears = asyncHandler(async (req, res) => {
    const semesterYears = await SemesterYearModel.find().sort({ year: -1 }).select('-createdAt -updatedAt').lean();
    res.status(200).json({
        status: 'success',
        data: semesterYears,
    });
});

// [POST] /api/v1/semester-years
const CreateSemesterYear = asyncHandler(async (req, res) => {
    let { semester, year } = req.body;
    year = year || new Date().getFullYear();

    const semesterYearExists = await SemesterYearModel.findOne({ semester, year }).lean();

    if (semesterYearExists) {
        res.status(400);
        throw new Error('Semester year already exists');
    }

    const semesterYear = await SemesterYearModel.create({ semester, year });

    res.status(201).json({
        status: 'success',
        data: semesterYear,
    });
});

// [GET] /api/v1/semester-years/:id
const GetSemesterYear = asyncHandler(async (req, res) => {
    const semesterYear = await SemesterYearModel.findById(req.params.id).lean();

    res.status(200).json({
        status: 'success',
        data: semesterYear,
    });
});

//[PUT] /api/v1/semester-years/:id
const UpdateSemesterYear = asyncHandler(async (req, res) => {
    const semesterYear = await SemesterYearModel.findByIdAndUpdate(req.params);
    const { semester, year } = req.body;

    semesterYear.semester = semester;

    semesterYear.year = year;

    await semesterYear.save();

    res.status(200).json({
        status: 'success',
        data: semesterYear,
    });
});

// [POST] /api/v1/grading-periods
const CreateGradingPeriod = asyncHandler(async (req, res) => {
    const { semester, year, startDate, endDate } = req.body;

    if (!semester || !year || !startDate || !endDate) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester, year, start date, and end date are required');
    }

    if (startDate > endDate) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Start date must be less than end date');
    }

    const semesterYearExists = await SemesterYearModel.findOne({
        semester,
        year,
    }).lean();

    if (!semesterYearExists) {
        throw new Error('Semester year does not exist');
    }

    const gradingPeriodExists = await GradingPeriodModel.findOne({
        semesterYear: semesterYearExists._id,
    }).lean();

    if (gradingPeriodExists) {
        throw new Error('Grading period already exists for this semester year');
    }

    const gradingPeriod = await GradingPeriodModel.create({
        semesterYear: semesterYearExists._id,
        startDate,
        endDate,
    });

    if (gradingPeriod) {
        const receivers = getAllUserIds('user');
        scheduleTrainingPointGradeNotifications({
            startAt: gradingPeriod.startDate,
            name: `Học kỳ ${semester} năm ${year}`,
            author: req.user.id,
            receiver: receivers,
        });
    }

    res.status(201).json({
        status: 'success',
        data: gradingPeriod,
    });
});

// [PUT] /api/v1/grading-periods/:id
const UpdateGradingPeriod = asyncHandler(async (req, res) => {
    const { startDate, endDate, status } = req.body;
    const gradingPeriod = await GradingPeriodModel.findById(req.params.id);

    if (!gradingPeriod) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Grading period not found');
    }
    gradingPeriod.startDate = startDate || gradingPeriod.startDate;
    gradingPeriod.endDate = endDate || gradingPeriod.endDate;
    gradingPeriod.status = status || gradingPeriod.status;

    await gradingPeriod.save();

    res.status(200).json({
        status: 'success',
        data: gradingPeriod,
    });
});

module.exports = {
    GetSemesterYears,
    CreateSemesterYear,
    GetSemesterYear,
    UpdateSemesterYear,
    CreateGradingPeriod,
    UpdateGradingPeriod,
};
