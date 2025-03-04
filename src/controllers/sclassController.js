const asyncHandle = require('express-async-handler');
const ClassSchema = require('../models/sclassModel');
const UserSchema = require('../models/userModel');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// [GET] /api/v1/classes/get-all
const GetAllClasses = asyncHandle(async (req, res) => {
    const classes = await ClassSchema.find().populate('teacher', 'fullName email').lean();
    const students = await UserSchema.find({ sclassName: { $in: classes.map((c) => c._id) } }).lean();

    classes.forEach((c) => {
        c.totalStudents = students.filter((s) => s.sclassName.toString() === c._id.toString()).length;
    });
    res.status(200).json({
        status: 'success',
        data: classes,
    });
});

// [GET] /api/v1/classes/:id
const GetClassById = asyncHandle(async (req, res) => {
    const classId = req.params.id;
    const classDetail = await ClassSchema.findById(classId).populate('teacher', 'fullName email').lean();

    if (!classDetail) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
    }

    res.status(200).json({
        status: 'success',
        data: classDetail,
    });
});

const GetAllStudentsByClassId = asyncHandle(async (req, res) => {
    const classId = req.params.id;
    let { page, size } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;

    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const classDetail = await ClassSchema.findById(classId).lean();

    if (!classDetail) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
    }

    const students = await UserSchema.find({ sclassName: classId }).limit(limit).skip(skip).lean();

    const total_documents = await UserSchema.countDocuments({ sclassName: classId });
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            students,
        },
    });
});

// [POST] /api/v1/classes/create
const CreateClass = asyncHandle(async (req, res) => {
    if (!req.body.name) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Name is required');
    }

    let hasTeacher;

    if (req.body.teacher) {
        hasTeacher = await User.findOne({ _id: req.body.teacher, role: 'teacher' }).lean();

        if (!hasTeacher) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Teacher does not exist');
        }
    }

    const hasClass = await ClassSchema.findOne({ name: req.body.name }).lean();
    if (hasClass) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Class has already existed');
    }

    const newClass = new ClassSchema({
        sclassName: req.body.name,
        teacher: hasTeacher ? hasTeacher._id : null,
    });

    await newClass.save();

    res.status(201).json({
        status: 'success',
        data: newClass,
    });
});

// [PUT] /api/v1/classes/update/:id
const UpdateClassById = asyncHandle(async (req, res) => {
    const classId = req.params.id;
    const classDetail = await ClassSchema.findById(classId);

    if (!classDetail) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
    }

    if (req.body.name) {
        classDetail.name = req.body.name;
    }

    if (req.body.teacher) {
        const hasTeacher = await UserSchema.findOne({ _id: req.body.teacher });
        if (!hasTeacher) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Teacher does not exist');
        }
        classDetail.teacher = hasTeacher._id;
    }

    await classDetail.save();

    res.status(200).json({
        status: 'success',
        data: classDetail,
    });
});

// [DELETE] /api/v1/classes/:id
const DeleteClassById = asyncHandle(async (req, res) => {
    const classId = req.params.id;
    const classDetail = await ClassSchema.findById(classId);

    if (!classDetail) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
    }

    await classDetail.remove();

    res.status(200).json({
        status: 'success',
        data: {},
    });
});

module.exports = {
    GetAllClasses,
    GetClassById,
    GetAllStudentsByClassId,
    UpdateClassById,
    DeleteClassById,
    CreateClass,
};
