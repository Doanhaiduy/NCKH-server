const SemesterYearModel = require('../models/semesterYearModel');
const asyncHandler = require('express-async-handler');

// [GET] /api/v1/semester-years
const GetSemesterYears = asyncHandler(async (req, res) => {
    const semesterYears = await SemesterYearModel.find().sort({ year: -1 }).select('-createdAt -updatedAt');
    res.status(200).json({
        status: 'success',
        data: semesterYears,
    });
});

// [POST] /api/v1/semester-years
const CreateSemesterYear = asyncHandler(async (req, res) => {
    let { semester, year } = req.body;
    year = year || new Date().getFullYear();

    const semesterYearExists = await SemesterYearModel.findOne({ semester, year });

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
    const semesterYear = await SemesterYearModel.findById(req.params.id);

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

module.exports = {
    GetSemesterYears,
    CreateSemesterYear,
    GetSemesterYear,
    UpdateSemesterYear,
};
