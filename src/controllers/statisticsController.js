const UserModel = require('../models/userModel');
const EventModel = require('../models/eventModel');
const PostModel = require('../models/postModel');
const ResponseModel = require('../models/responseModel');
const FeedbackModel = require('../models/feedbackModel');
const AttendanceModel = require('../models/attendanceModel');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { handleCache, setCache } = require('../configs/redis');
const SemesterYearModel = require('../models/semesterYearModel');

const GetRegisterEventStatistics = asyncHandler(async (req, res) => {
    let { page, size, search, semester, year, time } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `register_event_statistics_${page ? page : ''}_${size ? size : ''}_${search ? search : ''}`;

    const value = await handleCache(key);
    let query = {
        // startAt: { $gte: new Date() },
    };
    if (['past', 'upcoming', 'current'].includes(time)) {
        const currentDate = new Date();
        if (time === 'past') {
            query.startAt = { $lt: currentDate };
            query.endAt = { $lt: currentDate };
        } else if (time === 'upcoming') {
            query.startAt = { $gte: currentDate };
        } else if (time === 'current') {
            query.startAt = { $lte: currentDate };
            query.endAt = { $gte: currentDate };
        }
    }

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }
        query.semesterYear = semesterYear._id;
    }

    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    const events = await EventModel.find(query)
        .select('name location typeEvent registeredAttendees maxAttendees')
        .populate({ path: 'location', select: 'name' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

    const total_documents = await EventModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    const response = events.map((event) => {
        return {
            id: event._id,
            name: event.name,
            location: event.location.name,
            typeEvent: event.typeEvent,
            maxAttendees: event.maxAttendees,
            totalRegisteredAttendees: event.registeredAttendees ? event.registeredAttendees.length : 0,
        };
    });

    if (events.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: +page,
                size: +size,
                previous: previous_pages,
                next: next_pages,
                events: response,
            },
            60,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            data: response,
        },
    });
});

const GetAttendeesEventStatistics = asyncHandler(async (req, res) => {
    let { page, size, search, semester, year, time } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `attendees_event_statistics_${page ? page : ''}_${size ? size : ''}_${search ? search : ''}`;

    const value = await handleCache(key);
    let query = {
        // startAt: { $gte: new Date() },
    };
    if (['past', 'upcoming', 'current'].includes(time)) {
        const currentDate = new Date();
        if (time === 'past') {
            query.startAt = { $lt: currentDate };
            query.endAt = { $lt: currentDate };
        } else if (time === 'upcoming') {
            query.startAt = { $gte: currentDate };
        } else if (time === 'current') {
            query.startAt = { $lte: currentDate };
            query.endAt = { $gte: currentDate };
        }
    }

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }
        query.semesterYear = semesterYear._id;
    }

    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    const events = await EventModel.find(query)
        .select('name location typeEvent maxAttendees attendeesList')
        .populate({ path: 'location', select: 'name' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

    const total_documents = await EventModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size) - 1;

    const response = events.map((event) => {
        return {
            id: event._id,
            name: event.name,
            location: event.location.name,
            typeEvent: event.typeEvent,
            maxAttendees: event.maxAttendees,
            totalAttendees: event.attendeesList ? event.attendeesList.length : 0,
        };
    });

    if (events.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: +page,
                size: +size,
                previous: previous_pages,
                next: next_pages,
                events: response,
            },
            60,
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: +page,
            size: +size,
            previous: previous_pages,
            next: next_pages,
            data: response,
        },
    });
});

const GetOverviewForDashboard = asyncHandler(async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const totalEvents = await EventModel.countDocuments({
        startAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalNews = await PostModel.countDocuments({
        status: 'published',
        type: 'news',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalResponse = await ResponseModel.countDocuments({
        status: 'pending',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalFeedback = await FeedbackModel.countDocuments({
        status: 'approved',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    res.status(200).json({
        status: 'success',
        data: {
            totalEvents,
            totalNews,
            totalResponse,
            totalFeedback,
        },
    });
});

const GetTopStudent = asyncHandler(async (req, res) => {
    const { semester, year } = req.query;

    let query = {};

    const semesterYear = await SemesterYearModel.findOne({ semester, year: year || new Date().getFullYear() }).lean();

    if (semesterYear) {
        query.semesterYear = semesterYear;
    }

    const users = await UserModel.find().select('_id fullName').lean();

    let attendances = await AttendanceModel.find().select('event user').populate('event', 'semesterYear').lean();
    if (semesterYear) {
        attendances = attendances.filter(
            (attendance) => attendance.event.semesterYear.toString() === query.semesterYear._id.toString(),
        );
    }

    const topStudents = users
        .map((user) => {
            const attendance = attendances.filter((attendance) => attendance.user.toString() === user._id.toString());
            return {
                id: user._id,
                fullName: user.fullName,
                totalAttendance: attendance.length,
            };
        })
        .sort((a, b) => b.totalAttendance - a.totalAttendance)
        .slice(0, 5);

    res.status(200).json({
        status: 'success',
        data: topStudents,
    });
});

module.exports = { GetRegisterEventStatistics, GetAttendeesEventStatistics, GetOverviewForDashboard, GetTopStudent };
