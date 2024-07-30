const asyncHandler = require('express-async-handler');
const EventModel = require('../models/eventModel');
const AttendanceModel = require('../models/attendanceModel');
const UserModel = require('../models/userModel');
const PostModel = require('../models/postModel');
const QRCode = require('qrcode');
const { encryptData, uploadQRBase64 } = require('../utils');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const createQRCode = async (data) => {
    if (!data) return null;
    try {
        const jsonData = JSON.stringify(data);
        const encryptedData = encryptData(jsonData);

        let qrBase64 = await QRCode.toDataURL(
            JSON.stringify({
                data: encryptedData,
                message: 'Scan this QR code to check in',
            }),
            {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: {
                    dark: '#000',
                    light: '#fff',
                },
            }
        );

        const qrCodeUrl = await uploadQRBase64(qrBase64);
        console.log('qrCodeUrl', qrCodeUrl);
        return qrCodeUrl;
    } catch (error) {
        console.log('error', error);
    }
};

// [GET] /api/v1/events/get-all
const GetEvents = asyncHandler(async (req, res) => {
    let { page, size, status, time, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const query = {};
    const currentDate = new Date();

    if (['active', 'inactive'].includes(status)) {
        query.status = status;
    }

    if (time === 'past') {
        query.endDate = { $lt: currentDate };
    } else if (time === 'ongoing') {
        query.startDate = { $lte: currentDate };
        query.endDate = { $gte: currentDate };
    } else if (time === 'upcoming') {
        query.startDate = { $gt: currentDate };
    }

    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }

    const events = await EventModel.find(query)
        .select('name startAt endAt eventCode createdAt thumbnail')
        .populate('post', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    const total_documents = await EventModel.countDocuments(query);
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).json({
        message: 'Success',
        total: total_documents,
        page: page,
        size: size,
        previous: previous_pages,
        next: next_pages,
        data: events,
    });
});

// [GET] /api/v1/events/:id
const getEventByIdOrCode = asyncHandler(async (req, res) => {
    const idOrCode = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrCode) ? { _id: idOrCode } : { eventCode: idOrCode.toUpperCase() };

    const event = await EventModel.findOne(query)
        .select('-updatedAt -__v -attendeesList')
        .populate('author', 'fullName email')
        .populate('post', 'title');

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json({ data: event });
});

// [POST] /api/v1/events/create
const CreateEvent = asyncHandler(async (req, res) => {
    const {
        name,
        description,
        startAt = new Date(),
        endAt,
        maxAttendees = 100,
        location,
        distanceLimit,
        author,
        post = null,
        thumbnail,
    } = req.body;

    const eventCode = 'EVENT-' + Date.now();
    if (startAt > endAt) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Start date must be before end date');
    }

    if (!name || !description || !endAt || !location || !distanceLimit || !author) {
        throw new ApiError(
            statusCodes.BAD_REQUEST,
            'Name, description, end date, location, distance limit, author are required'
        );
    }

    if (post) {
        if (!mongoose.Types.ObjectId.isValid(post)) {
            throw new ApiError(statusCodes.BAD_REQUEST, 'Invalid post id');
        } else {
            const postExist = await PostModel.findById(post);
            if (!postExist) {
                throw new ApiError(statusCodes.NOT_FOUND, 'Post not found');
            }
        }
    }

    const qrCodeUrl = await createQRCode({
        eventCode,
        name,
        location,
        distanceLimit,
        startAt,
        endAt,
        maxAttendees,
    });

    const event = new EventModel({
        eventCode,
        name,
        description,
        startAt,
        endAt,
        maxAttendees,
        location,
        distanceLimit,
        qrCodeUrl,
        author,
        post,
        thumbnail,
    });

    const createdEvent = await event.save();

    res.status(201).json({
        message: 'Success',
        data: createdEvent,
    });
});

// [PUT] /api/v1/events/:id
const UpdateEvent = asyncHandler(async (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const startAt = req.body.startAt;
    const endAt = req.body.endAt;
    const maxAttendees = req.body.maxAttendees;
    const location = req.body.location;
    const distanceLimit = req.body.distanceLimit;
    const thumbnail = req.body.thumbnail;
    const post = req.body.post;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Invalid event id');
    }

    const event = await EventModel.findById(req.params.id);

    if (!name && !description && !startAt && !endAt && !maxAttendees && !location && !distanceLimit) {
        event.thumbnail = thumbnail || event.thumbnail;
        event.post = post || event.post;
        const updatedEvent = await event.save();
        return res.status(200).json({
            message: 'Success',
            data: updatedEvent,
        });
    }

    if (startAt > endAt) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Start date must be before end date');
    }

    const newEventCode = 'EVENT-' + Date.now();

    const qrCodeUrl = await createQRCode({
        eventCode: newEventCode,
        name: name || event.name,
        location: location || event.location,
        distanceLimit: distanceLimit || event.distanceLimit,
        startAt: startAt || event.startAt,
        endAt: endAt || event.endAt,
        maxAttendees: maxAttendees || event.maxAttendees,
    });

    event.eventCode = newEventCode;
    event.name = name || event.name;
    event.description = description || event.description;
    event.startAt = startAt || event.startAt;
    event.endAt = endAt || event.endAt;
    event.maxAttendees = maxAttendees || event.maxAttendees;
    event.location = location || event.location;
    event.distanceLimit = distanceLimit || event.distanceLimit;
    event.qrCodeUrl = qrCodeUrl || event.qrCodeUrl;
    event.thumbnail = thumbnail || event.thumbnail;
    event.post = post || event.post;

    const updatedEvent = await event.save();

    res.status(200).json({
        message: 'Success',
        data: updatedEvent,
    });
});

// [DELETE] /api/v1/events/:id
const DeleteEvent = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Invalid event id');
    }

    const event = await EventModel.findById(req.params.id);
    if (!event) {
        throw new ApiError(statusCodes.NOT_FOUND, 'Event not found');
    }

    await event.deleteOne();
    res.status(200).json({
        message: 'Event removed',
    });
});

// [GET] /api/v1/events/:id/attendees
const GetAttendeesList = asyncHandler(async (req, res) => {
    let { status, page, size } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let query = {};

    if (['pending', 'approved', 'rejected'].includes(status)) {
        query.status = status;
    }

    const event = await EventModel.findById(req.params.id)
        .populate({ path: 'attendeesList', match: query, select: '-updatedAt -__v -createdAt', limit, skip })
        .select('attendeesList');

    if (!event) {
        throw new ApiError(statusCodes.NOT_FOUND, 'Event not found');
    }

    const total_documents = event.attendeesList.length;
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).json({
        message: 'Success',
        total: total_documents,
        page: page,
        size: size,
        previous: previous_pages,
        next: next_pages,
        data: event.attendeesList,
    });
});

// [POST] /api/v1/events/:id/check-in
const CheckInEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lat, lng, name, time, userId } = req.body;
    const event = await EventModel.findById(id);

    if (!event) {
        throw new ApiError(statusCodes.NOT_FOUND, 'Event not found');
    }

    // if (event.startAt > new Date()) {
    //     throw new ApiError(statusCodes.BAD_REQUEST, 'Event has not started yet');
    // }

    // if (event.endAt < new Date()) {
    //     throw new ApiError(statusCodes.BAD_REQUEST, 'Event has ended');
    // }

    if (event.attendeesList.length >= event.maxAttendees) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Event has reached maximum attendees');
    }

    if (time < event.startAt || time > event.endAt) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Invalid check in time');
    }

    const attendance = await AttendanceModel.findOne({ event: id, user: req.user._id });

    if (attendance) {
        throw new ApiError(statusCodes.BAD_REQUEST, 'You have already checked in');
    }

    const newAttendance = new AttendanceModel({
        event: id,
        user: userId,
        checkInAt: time,
        location: {
            lat,
            lng,
            name,
        },
    });

    event.attendeesList.push(newAttendance._id);
    await newAttendance.save();
    await event.save();

    res.status(200).json({
        message: 'Success',
        data: newAttendance,
    });
});

// [PUT] /api/v1/attendances/:id
const UpdateStatusAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const attendance = await AttendanceModel.findById(id);

    if (!attendance) {
        throw new ApiError(statusCodes.NOT_FOUND, 'Attendance not found');
    }

    if (status === 'approved') {
        attendance.status = status;
    } else if (status === 'rejected') {
        attendance.status = status;
    } else {
        throw new ApiError(statusCodes.BAD_REQUEST, 'Invalid status');
    }

    const updatedAttendance = await attendance.save();

    res.status(200).json({
        message: 'Success',
        data: updatedAttendance,
    });
});

// [GET] /api/v1/users/:id/attendance
const GetAttendanceByUser = asyncHandler(async (req, res) => {
    const idOrUsername = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrUsername) ? { _id: idOrUsername } : { username: idOrUsername };

    const user = await UserModel.findOne(query).select('_id');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const attendances = await AttendanceModel.find({ user: user._id })
        .populate('event', 'name startAt endAt location')
        .populate('user', 'fullName username email');

    res.status(200).json({
        message: 'Success',
        data: attendances,
    });
});

module.exports = {
    GetEvents,
    getEventByIdOrCode,
    CreateEvent,
    UpdateEvent,
    DeleteEvent,
    GetAttendeesList,
    CheckInEvent,
    UpdateStatusAttendance,
    GetAttendanceByUser,
};
