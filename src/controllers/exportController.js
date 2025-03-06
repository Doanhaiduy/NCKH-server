const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const EventModel = require('../models/eventModel');
const UserModel = require('../models/userModel');
const PostModel = require('../models/postModel');
const FeedbackModel = require('../models/feedbackModel');
const { TrainingPointSchema } = require('../models/trainingPointModel');
const SemesterYearModel = require('../models/semesterYearModel');
const ApiError = require('../utils/ApiError');
const { createExcelReport } = require('../utils/excel');
const { getStatusAtTimeVN } = require('../utils');
const { getAllUserByClass } = require('../services/userService');
const { getAssessmentTime } = require('./trainingPointController');
require('dotenv').config();

// [GET] /api/v1/export/event/:id
const exportEventData = expressAsyncHandler(async (req, res) => {
    const idOrCode = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrCode) ? { _id: idOrCode } : { eventCode: idOrCode.toUpperCase() };

    const event = await EventModel.findOne(query)
        .populate('author', 'fullName email')
        .populate('semesterYear', 'semester year')
        .populate('post', 'title')
        .populate({
            path: 'attendeesList',
            populate: {
                path: 'user',
                select: '_id username fullName email',
            },
        })
        .populate('registeredAttendees')
        .lean();
    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    const eventData = {
        eventCode: event.eventCode,
        name: event.name,
        description: event.description,
        startAt: new Date(event.startAt).toLocaleString(),
        endAt: new Date(event.endAt).toLocaleString(),
        maxAttendees: event.maxAttendees,
        typeEvent: event.typeEvent,
        location: event.location.name,
        distanceLimit: event.distanceLimit,
        qrCodeUrl: event.qrCodeUrl,
        status: event.status,
        typeEvent: event.typeEvent,
        semester: event.semesterYear ? `${event.semesterYear.semester} - ${event.semesterYear.year}` : 'N/A',
        author: event.author ? event.author.fullName : 'N/A',
    };

    const attendees = event.attendeesList
        ? event.attendeesList.map((attendance, index) => {
              return {
                  no: index + 1,
                  username: attendance.user?.username || 'N/A',
                  fullName: attendance.user?.fullName || 'N/A',
                  email: attendance.user?.email || 'N/A',
                  checkInTime: attendance.checkInAt ? new Date(attendance.checkInAt).toLocaleString() : 'N/A',
                  location: `${attendance.location?.name} - distance: ${attendance.distance}m`,
              };
          })
        : [];

    attendees.sort((a, b) => {
        // sort by time checkin
        if (a.checkInTime === 'N/A' && b.checkInTime === 'N/A') {
            return 0;
        }
        if (a.checkInTime === 'N/A') {
            return 1;
        }

        if (b.checkInTime === 'N/A') {
            return -1;
        }

        return new Date(b.checkInTime) - new Date(a.checkInTime);
    });
    const registeredAttendees = event.registeredAttendees
        ? event.registeredAttendees.map((attendance, index) => {
              return {
                  no: index + 1,
                  username: attendance.username || 'N/A',
                  fullName: attendance.fullName || 'N/A',
                  email: attendance.email || 'N/A',
              };
          })
        : [];

    const sections = [
        {
            type: 'info',
            title: 'EVENT INFORMATION',
            data: [
                {
                    key: 'Event Code:',
                    value: eventData.eventCode,
                    key2: 'Status:',
                    value2: getStatusAtTimeVN(new Date(event.startAt), new Date(event.endAt)),
                },
                { key: 'Event Name:', value: eventData.name, key2: 'Type:', value2: eventData.typeEvent },
                {
                    key: 'Description:',
                    value: eventData.description,
                    key2: 'Created At:',
                    value2: new Date(event.createdAt).toLocaleString(),
                },
                { key: 'Start Time:', value: eventData.startAt, key2: 'End Time:', value2: eventData.endAt },
                { key: 'Location:', value: eventData.location, key2: 'QRCode:', value2: eventData.qrCodeUrl },
                {
                    key: 'Distance Limit:',
                    value: `${eventData.distanceLimit} meters`,
                    key2: 'Max Attendees:',
                    value2: `${eventData.maxAttendees}`,
                },
                { key: 'Semester:', value: eventData.semester, key2: 'Author:', value2: eventData.author },
                {
                    key: 'Number of Registered Attendees:',
                    value: `${registeredAttendees.length} / ${eventData.maxAttendees}`,
                    key2: 'Number of Attendees:',
                    value2: `${attendees.length} / ${eventData.maxAttendees}`,
                },
            ],
        },
        {
            type: 'table',
            title: 'ATTENDEES LIST',
            data: {
                headers: ['No.', 'Username', 'Full Name', 'Email', 'Check In Time', 'Location'],
                rows: attendees.map((a, index) => [
                    index + 1,
                    a.username,
                    a.fullName,
                    a.email,
                    a.checkInTime,
                    a.location,
                ]),
            },
        },

        event.typeEvent === 'optional' && {
            type: 'table',
            title: 'REGISTERED ATTENDEES LIST',
            data: {
                headers: ['No.', 'Username', 'Full Name', 'Email'],
                rows: registeredAttendees.map((a) => [a.no, a.username, a.fullName, a.email]),
            },
        },
        {
            type: 'summary',
            title: 'SUMMARY',
            data: [
                {
                    label: 'Total Attendees:',
                    value: attendees.length,
                    label2: 'Max Capacity:',
                    value2: eventData.maxAttendees,
                },
                {
                    label: 'Attendance Rate:',
                    value: `${
                        eventData.maxAttendees ? Math.round((attendees.length / eventData.maxAttendees) * 100) : 0
                    }%`,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'EVENT ATTENDANCE REPORT',
        filename: `event_${event.eventCode}_report`,
        sections,
        response: res,
    });
});

const exportEventsList = expressAsyncHandler(async (req, res) => {
    let { time, semester, year, typeEvent, month } = req.query;
    const user = req.user;

    const filter = {};
    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year });
        if (semesterYear) {
            filter.semesterYear = semesterYear._id;
        }
    }
    if (['mandatory', 'optional'].includes(typeEvent)) {
        filter.typeEvent = typeEvent;
    }

    const currentDate = new Date();

    if (time === 'past') {
        filter.endAt = { $lt: currentDate };
    } else if (time === 'ongoing') {
        filter.startAt = { $lte: currentDate };
        filter.endAt = { $gte: currentDate };
    } else if (time === 'upcoming') {
        filter.startAt = { $gt: currentDate };
    }

    if (month) {
        const startMonth = new Date(currentDate.getFullYear(), month - 1, 1);
        const endMonth = new Date(currentDate.getFullYear(), month, 0);
        filter.startAt = { $gte: startMonth, $lte: endMonth };
    }

    const events = await EventModel.find(filter)
        .populate('author', 'fullName')
        .populate('semesterYear')
        .sort({ startAt: -1 })
        .lean();

    // Prepare sections for the report
    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Events:',
                    value2: events.length,
                },
                {
                    key: 'Filter Semester:',
                    value: semester && year ? `${semester} - ${year}` : 'All',
                    key2: 'Status Filter:',
                    value2:
                        time === 'past'
                            ? 'Past Events'
                            : time === 'ongoing'
                            ? 'Ongoing Events'
                            : time === 'upcoming'
                            ? 'Upcoming Events'
                            : 'All Status',
                },
                {
                    key: 'Type Filter:',
                    value: typeEvent === 'mandatory' ? 'Mandatory' : typeEvent === 'optional' ? 'Optional' : 'All Type',
                    key2: 'Month Filter:',
                    value2: month ? `Month ${month}` : 'All',
                },
            ],
        },
        {
            type: 'table',
            title: 'EVENTS LIST',
            data: {
                headers: [
                    'No.',
                    'Event Code',
                    'Event Name',
                    'Event Type',
                    'Start Date',
                    'End Date',
                    'Location',
                    'QRCode',
                    'QRCodeUrl',
                    'Number of Registered Attendees',
                    'Number of Attendees',
                    'Status',
                ],
                rows: events.map((event, index) => [
                    index + 1,
                    event.eventCode,
                    event.name,
                    event.typeEvent,
                    new Date(event.startAt).toLocaleString(),
                    new Date(event.endAt).toLocaleString(),
                    event.location?.name || 'N/A',
                    event.qrCodeUrl,
                    event.qrCodeUrl,
                    `${event.registeredAttendees?.length || 0} / ${event.maxAttendees || 0}`,
                    `${event.attendeesList?.length || 0} / ${event.maxAttendees || 0}`,
                    getStatusAtTimeVN(new Date(event.startAt), new Date(event.endAt)),
                ]),
                imageColumns: [
                    {
                        index: 8,
                        width: 100,
                        height: 100,
                    },
                ],
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Active Events:',
                    value: events.filter((e) => {
                        const now = new Date();
                        return new Date(e.startAt) <= now && new Date(e.endAt) >= now;
                    }).length,
                    label2: 'Completed Events:',
                    value2: events.filter((e) => {
                        const now = new Date();
                        return new Date(e.endAt) < now;
                    }).length,
                },
                {
                    label: 'Average Attendees:',
                    value: Math.round(
                        events.reduce((sum, event) => sum + (event.attendeesList?.length || 0), 0) /
                            (events.length || 1),
                    ),
                },
            ],
        },
    ];

    // Create and send the Excel report
    await createExcelReport({
        title: 'EVENTS LIST REPORT',
        filename: `events_list_report${time ? `_${time}` : ''}${semester ? `_${semester}_${year}` : ''}${
            month ? `_${month}` : ''
        }${typeEvent ? `_${typeEvent}` : ''}`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 15 }, // B - No
            { width: 20 }, // C - Event Code
            { width: 30 }, // D - Event Name
            { width: 15 }, // D - Event Name
            { width: 20 }, // E - Start Date
            { width: 20 }, // F - End Date
            { width: 20 }, // G - Location
            { width: 20 }, // H - QRCode
            { width: 50 }, // I - QRCodeUrl
            { width: 20 }, // J - Attendees
            { width: 20 }, // K - Registered Attendees
            { width: 20 }, // L - Status
        ],
        author: user?.fullName,
    });
});

const exportStudentsList = expressAsyncHandler(async (req, res) => {
    const students = await UserModel.find().populate('role', 'name').populate('sclassName', 'sclassName').lean();

    students.sort((a, b) => {
        const lastName = (name) => name.split(' ').slice(-1)[0];
        return lastName(a.fullName).localeCompare(lastName(b.fullName));
    });
    // Prepare sections for the report
    const sections = [
        {
            type: 'header',
            title: 'STUDENT INFORMATION',
        },
        {
            type: 'text',
            data: `Total students: ${students.length}`,
        },
        {
            type: 'table',
            title: 'STUDENTS LIST',
            data: {
                headers: [
                    'No.',
                    'Username',
                    'Full Name',
                    'Email',
                    'Phone',
                    'Dob',
                    'Gender',
                    'avatar',
                    'Last Login',
                    'Role',
                    'Class',
                ],
                rows: students.map((student, index) => [
                    index + 1,
                    student.username,
                    student.fullName,
                    student.email,
                    student.phone || 'N/A',
                    student.dob || 'N/A',
                    student.gender || 'N/A',
                    student.avatar || 'N/A',
                    student.lastLogin || 'N/A',
                    student.role.name,
                    student.sclassName.sclassName,
                ]),
                imageColumns: [
                    {
                        index: 8,
                        width: 100,
                        height: 100,
                    },
                ],
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Students:',
                    value: students.length,
                },
            ],
        },
    ];

    // Create and send the Excel report
    await createExcelReport({
        title: 'STUDENTS REPORT',
        filename: `students_list_report`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 8 }, // B - No
            { width: 20 }, // C - Username
            { width: 25 }, // D - Full Name
            { width: 30 }, // E - Email
            { width: 15 }, // F - Phone
            { width: 15 }, // H - Avatar (sẽ hiển thị hình ảnh nhỏ)
            { width: 15 }, // I - Dob
            { width: 40 }, // J - Gender
            { width: 20 }, // K - Last Login
            { width: 15 }, // L - Role
            { width: 15 }, // M - Class
        ],
    });
});

const exportPostsList = expressAsyncHandler(async (req, res) => {
    let { status, type } = req.query;

    let query = {};

    if (['news', 'activity'].includes(type)) {
        query.type = type;
    }

    if (['published', 'draft'].includes(status)) {
        query.status = status;
    }

    const posts = await PostModel.find(query)
        .select('-content -updatedAt -__v')
        .populate('author', 'fullName email')
        .sort({ createdAt: -1 })
        .lean();

    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Posts:',
                    value2: posts.length,
                },
                {
                    key: 'Filter Status:',
                    value: ['published', 'draft'].includes(status) ? status : 'All',
                    key2: 'Filter Type:',
                    value2: ['news', 'activity'].includes(type) ? type : 'All',
                },
            ],
        },
        {
            type: 'table',
            title: ['news', 'activity'].includes(type) ? `${type.toUpperCase()} POSTS LIST` : 'POSTS LIST',
            data: {
                headers: ['No.', 'Title', 'Author', 'Type', 'Status', 'Created At', 'URL'],
                rows: posts.map((post, index) => [
                    index + 1,
                    post.title,
                    post.author.fullName,
                    post.type,
                    post.status,
                    new Date(post.createdAt).toLocaleString(),
                    `${process.env.BASE_URL_VIEWS}/posts/${post.slug || post._id}`,
                ]),
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Posts:',
                    value: posts.length,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'POSTS LIST REPORT',
        filename: `posts_list_report${status ? `_${status}` : ''}${type ? `_${type}` : ''}`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 8 }, // B - No
            { width: 40 }, // C - Title
            { width: 20 }, // D - Author
            { width: 15 }, // E - Type
            { width: 15 }, // F - Status
            { width: 20 }, // G - Created At
            { width: 40 }, // G - Created At
        ],
    });
});

const exportFeedbacksList = expressAsyncHandler(async (req, res) => {
    const feedbacks = await FeedbackModel.find()
        .select('-updatedAt -__v')
        .populate('user', 'username fullName email')
        .sort({ createdAt: -1 })
        .lean();

    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Feedbacks:',
                    value2: feedbacks.length,
                },
            ],
        },
        {
            type: 'table',
            title: 'FEEDBACKS LIST',
            data: {
                headers: ['No.', 'Feedback', 'Author', 'Email', 'Username', 'Created At'],
                rows: feedbacks.map((feedback, index) => [
                    index + 1,
                    feedback.feedback,
                    feedback.user.fullName,
                    feedback.user.email,
                    feedback.user.username,
                    new Date(feedback.createdAt).toLocaleString(),
                ]),
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Feedbacks:',
                    value: feedbacks.length,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'FEEDBACKS LIST REPORT',
        filename: `feedbacks_list_report`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 8 }, // B - No
            { width: 80 }, // C - Feedback
            { width: 20 }, // D - Author
            { width: 20 }, // E - Created At
            { width: 20 }, // F - Email
            { width: 20 }, // G - Username
        ],
    });
});

const exportTrainingPointList = expressAsyncHandler(async (req, res) => {
    const { semester, year } = req.query;
    const query = {};
    let gradingPeriod = null;

    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        query.semesterYear = semesterYear._id;

        gradingPeriod = await getAssessmentTime(semesterYear._id);
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'semester and year is required');
    }

    const trainingPoints = await TrainingPointSchema.find(query)
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
        .populate({
            path: 'user',
            select: 'username fullName email',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
        .lean();

    trainingPoints.sort((a, b) => {
        const lastName = (name) => name.split(' ').slice(-1)[0];
        return lastName(a.user.fullName).localeCompare(lastName(b.user.fullName));
    });

    const totalAssessment = trainingPoints.filter((tp) => tp.tempScore !== 0).length;

    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Training Points:',
                    value2: trainingPoints.length,
                },
                {
                    key: 'Filter Semester:',
                    value: semester && year ? `${semester} - ${year}` : 'All',
                    key2: 'Total Assessment:',
                    value2: totalAssessment,
                },
                {
                    key: 'Assessment Start Time:',
                    value: gradingPeriod?.AssessmentStartTime
                        ? new Date(gradingPeriod?.AssessmentStartTime).toLocaleString()
                        : 'N/A',
                    key2: 'Assessment End Time:',
                    value2: gradingPeriod?.AssessmentEndTime
                        ? new Date(gradingPeriod?.AssessmentEndTime).toLocaleString()
                        : 'N/A',
                },
            ],
        },
        {
            type: 'table',
            title: `TRAINING POINTS LIST ${semester && year ? `(${semester} - ${year})` : ''}`,
            data: {
                headers: [
                    'No.',
                    'Username',
                    'Full Name',
                    'Email',
                    'Class',
                    'Semester',
                    'Year',
                    'Assessment Score',
                    'Approved Score',
                ],
                rows: trainingPoints.map((tp, index) => [
                    index + 1,
                    tp.user.username,
                    tp.user.fullName,
                    tp.user.email,
                    tp.user.sclassName.sclassName,
                    tp.semesterYear.semester,
                    tp.semesterYear.year,
                    tp.tempScore,
                    tp.totalScore,
                ]),
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Training Points:',
                    value: trainingPoints.length,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'TRAINING POINTS REPORT',
        filename: `training_points_report${semester ? `_${semester}_${year}` : ''}`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 15 }, // B - No
            { width: 20 }, // C - Username
            { width: 30 }, // D - Full Name
            { width: 30 }, // E - Email
            { width: 15 }, // F - Semester
            { width: 15 }, // G - Year
            { width: 15 }, // H - Assessment Score
            { width: 15 }, // I - Approved Score
        ],
    });
});

const exportTrainingPointListByClass = expressAsyncHandler(async (req, res) => {
    const { semester, year } = req.query;
    const { classId } = req.params;
    const query = {};
    let gradingPeriod = null;
    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        query.semesterYear = semesterYear._id;

        gradingPeriod = await getAssessmentTime(semesterYear._id);
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'semester and year is required');
    }

    if (classId) {
        userIdArr = await getAllUserByClass(classId);
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'classId is required');
    }

    if (userIdArr.length !== 0) {
        query.user = { $in: userIdArr };
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Class not found');
    }

    const trainingPoints = await TrainingPointSchema.find(query)
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
        .populate({
            path: 'user',
            select: 'username fullName email sclassName',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
        .lean();

    trainingPoints.sort((a, b) => {
        const lastName = (name) => name.split(' ').slice(-1)[0];
        return lastName(a.user.fullName).localeCompare(lastName(b.user.fullName));
    });

    const totalAssessment = trainingPoints.filter((tp) => tp.tempScore !== 0).length;

    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Training Points:',
                    value2: trainingPoints.length,
                },
                {
                    key: 'Filter Semester:',
                    value: semester && year ? `${semester} - ${year}` : 'All',
                    key2: 'Total Assessment:',
                    value2: totalAssessment,
                },
                {
                    key: 'Filter Class:',
                    value: trainingPoints.length !== 0 ? trainingPoints[0].user.sclassName.sclassName : 'All',
                    key2: 'Total Students:',
                    value2: userIdArr.length,
                },
                {
                    key: 'Assessment Start Time:',
                    value: gradingPeriod?.AssessmentStartTime
                        ? new Date(gradingPeriod?.AssessmentStartTime).toLocaleString()
                        : 'N/A',
                    key2: 'Assessment End Time:',
                    value2: gradingPeriod?.AssessmentEndTime
                        ? new Date(gradingPeriod?.AssessmentEndTime).toLocaleString()
                        : 'N/A',
                },
            ],
        },
        {
            type: 'table',
            title: `TRAINING POINTS LIST ${semester && year ? `(${semester} - ${year})` : ''}`,
            data: {
                headers: [
                    'No.',
                    'Username',
                    'Full Name',
                    'Email',
                    'Semester',
                    'Year',
                    'Assessment Score',
                    'Approved Score',
                ],
                rows: trainingPoints.map((tp, index) => [
                    index + 1,
                    tp.user.username,
                    tp.user.fullName,
                    tp.user.email,
                    tp.semesterYear.semester,
                    tp.semesterYear.year,
                    tp.tempScore,
                    tp.totalScore,
                ]),
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Training Points:',
                    value: trainingPoints.length,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'TRAINING POINTS REPORT',
        filename: `training_points_report${semester ? `_${semester}_${year}` : ''}`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 15 }, // B - No
            { width: 20 }, // C - Username
            { width: 30 }, // D - Full Name
            { width: 30 }, // E - Email
            { width: 15 }, // F - Semester
            { width: 15 }, // G - Year
            { width: 15 }, // H - Assessment Score
            { width: 15 }, // I - Approved Score
        ],
    });
});

const exportTrainingPointListByUser = expressAsyncHandler(async (req, res) => {
    const { semester, year } = req.query;
    const { userId } = req.params;
    let gradingPeriod = null;
    const query = {};
    if (semester && year) {
        const semesterYear = await SemesterYearModel.findOne({ semester, year }).lean();

        if (!semesterYear) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Semester and year not found');
        }

        query.semesterYear = semesterYear._id;

        gradingPeriod = await getAssessmentTime(semesterYear._id);
    }

    if (userId) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
            const existingUser = await UserModel.findById(userId);
            if (!existingUser) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
            }
            query.user = userId;
        }
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'userId is required');
    }

    const trainingPoints = await TrainingPointSchema.find(query)
        .populate({
            path: 'semesterYear',
            select: '-updatedAt -createdAt',
        })
        .populate({
            path: 'user',
            select: 'username fullName email',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
        .lean();
    trainingPoints.sort((a, b) => {
        if (a.semesterYear.year === b.semesterYear.year) {
            if (a.semesterYear.semester === b.semesterYear.semester) {
                return a.tempScore - b.tempScore;
            }
            return a.semesterYear.semester - b.semesterYear.semester;
        }
        return a.semesterYear.year - b.semesterYear.year;
    });

    const totalAssessment = trainingPoints.filter((tp) => tp.tempScore !== 0).length;

    const sections = [
        {
            type: 'info',
            title: 'REPORT INFORMATION',
            data: [
                {
                    key: 'Report Date:',
                    value: new Date().toLocaleDateString(),
                    key2: 'Total Training Points:',
                    value2: trainingPoints.length,
                },
                {
                    key: 'Filter Semester:',
                    value: semester && year ? `${semester} - ${year}` : 'All',
                    key2: 'Total Assessment:',
                    value2: totalAssessment,
                },
                {
                    key: 'Username:',
                    value: trainingPoints.length !== 0 ? trainingPoints[0].user.username : 'N/A',
                    key2: 'Full Name:',
                    value2: trainingPoints.length !== 0 ? trainingPoints[0].user.fullName : 'N/A',
                },
                {
                    key: 'Email:',
                    value: trainingPoints.length !== 0 ? trainingPoints[0].user.email : 'N/A',
                    key2: 'Class:',
                    value2: trainingPoints.length !== 0 ? trainingPoints[0].user.sclassName.sclassName : 'N/A',
                },
                {
                    key: 'Assessment Start Time:',
                    value: gradingPeriod?.AssessmentStartTime
                        ? new Date(gradingPeriod?.AssessmentStartTime).toLocaleString()
                        : 'N/A',
                    key2: 'Assessment End Time:',
                    value2: gradingPeriod?.AssessmentEndTime
                        ? new Date(gradingPeriod?.AssessmentEndTime).toLocaleString()
                        : 'N/A',
                },
            ],
        },
        {
            type: 'table',
            title: `TRAINING POINTS LIST ${semester && year ? `(${semester} - ${year})` : ''} ${
                trainingPoints.length !== 0 ? ` - ${trainingPoints[0].user.fullName}` : ''
            }`,
            data: {
                headers: ['No.', 'Semester', 'Year', 'Assessment Score', 'Approved Score'],
                rows: trainingPoints.map((tp, index) => [
                    index + 1,
                    tp.semesterYear.semester,
                    tp.semesterYear.year,
                    tp.tempScore,
                    tp.totalScore,
                ]),
            },
        },
        {
            type: 'summary',
            title: 'STATISTICS',
            data: [
                {
                    label: 'Total Training Points:',
                    value: trainingPoints.length,
                },
            ],
        },
    ];

    await createExcelReport({
        title: 'TRAINING POINTS REPORT',
        filename: `training_points_report${semester ? `_${semester}_${year}` : ''}`,
        sections,
        response: res,
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 15 }, // B - No
            { width: 30 }, // C - Semester
            { width: 30 }, // D - Year
            { width: 30 }, // E - Assessment Score
            { width: 30 }, // F - Approved Score
        ],
    });
});

const exportTrainingPointById = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;

    const trainingPoint = await TrainingPointSchema.findById(id)
        .select('-updatedAt -createdAt')
        .populate({
            path: 'user',
            select: 'username fullName email sclassName',
            populate: {
                path: 'sclassName',
                select: 'sclassName',
            },
        })
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
        .populate({
            path: 'criteria.evidence',
            select: '-updatedAt -createdAt',
        })
        .populate({
            path: 'criteria.subCriteria.subCriteria.evidence',
            select: '-updatedAt -createdAt',
        })
        .lean();

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

    const sections = [
        {
            type: 'info',
            title: 'Thông tin học kỳ',
            data: [
                {
                    key: 'Họ và tên',
                    value: trainingPoint.user.fullName,
                    key2: 'Lớp',
                    value2: trainingPoint.user.sclassName.sclassName,
                },
                {
                    key: 'Username',
                    value: trainingPoint.user.username,
                    key2: 'Email',
                    value2: trainingPoint.user.email,
                },
                {
                    key: 'Học kỳ',
                    value: `${trainingPoint.semesterYear.semester}`,
                    key2: 'Năm học',
                    value2: `${trainingPoint.semesterYear.year}`,
                },
                {
                    key: 'Điểm tự đánh giá',
                    value: `${trainingPoint.tempScore || 0}`,
                    key2: 'Tổng điểm đã duyệt',
                    value2: `${trainingPoint.totalScore || 0}`,
                },
                {
                    key: 'Assessment Start Time:',
                    value: AssessmentStartTime ? new Date(AssessmentStartTime).toLocaleString() : 'N/A',
                    key2: 'Assessment End Time:',
                    value2: AssessmentEndTime ? new Date(AssessmentEndTime).toLocaleString() : 'N/A',
                },
                {
                    key: 'Trạng thái',
                    value: isLocked ? 'Đang khóa' : 'Đang mở',
                },
            ],
        },
    ];

    // Process criteria sections
    trainingPoint.criteria.forEach((criterion, index) => {
        const criterionSection = {
            type: 'table',
            title: `${criterion.criteriaCode}. ${criterion.title}`,
            data: {
                headers: ['Mã Tiêu Chí', 'Tên Tiêu chí', 'Điểm tối đa', 'Điểm Tự Đánh Giá', 'Điểm Đã Duyệt', 'Ghi chú'],
                rows: [],
            },
        };

        // Add main criterion
        criterionSection.data.rows.push([
            criterion.criteriaCode,
            criterion.title,
            criterion.maxScore,
            criterion.tempScore,
            criterion.totalScore,
            criterion.description,
        ]);

        // Add sub-criteria

        criterion.subCriteria.forEach((subCriterion, subIndex) => {
            criterionSection.data.rows.push([
                subCriterion.criteriaCode,
                subCriterion.title,
                subCriterion.maxScore,
                subCriterion.tempScore,
                subCriterion.totalScore,
                subCriterion.description,
            ]);

            // Add sub-sub-criteria
            subCriterion.subCriteria.forEach((subSubCriterion, subSubIndex) => {
                criterionSection.data.rows.push([
                    subSubCriterion.criteriaCode,
                    subSubCriterion.title,
                    subSubCriterion.maxScore,
                    subSubCriterion.tempScore,
                    subSubCriterion.totalScore,
                    subSubCriterion.description,
                ]);
            });
        });

        sections.push(criterionSection);
    });

    // Add summary section
    sections.push({
        type: 'summary',
        title: 'Tổng kết',
        data: [
            {
                label: 'Assessment Score',
                value: `${trainingPoint.tempScore || 0}`,
                label2: 'Approved Score',
                value2: `${trainingPoint.totalScore || 0}`,
            },
        ],
    });

    // Create Excel report
    await createExcelReport({
        title: 'PHIẾU ĐÁNH GIÁ ĐIỂM RÈN LUYỆN SINH VIÊN',
        filename: `training_point_${trainingPoint._id}`,
        sections: sections,
        response: res,
        author: req.user ? req.user.name : 'N/A',
        columnWidths: [
            { width: 5 }, // A - margin
            { width: 20 }, // B - Criteria Code
            { width: 50 }, // C - Criteria Title
            { width: 25 }, // D - Max Score
            { width: 25 }, // E - Temp Score
            { width: 25 }, // F - Total Score
            { width: 40 }, // G - Description
        ],
    });
});

module.exports = {
    exportEventData,
    exportStudentsList,
    exportEventsList,
    exportPostsList,
    exportFeedbacksList,
    exportTrainingPointList,
    exportTrainingPointListByClass,
    exportTrainingPointListByUser,
    exportTrainingPointById,
};
