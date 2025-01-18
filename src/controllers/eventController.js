const asyncHandler = require('express-async-handler');
const EventModel = require('../models/eventModel');
const AttendanceModel = require('../models/attendanceModel');
const UserModel = require('../models/userModel');
const PostModel = require('../models/postModel');
const SemesterYearModel = require('../models/semesterYearModel');
const QRCode = require('qrcode');
const { encryptData, decryptData, getCurrentSemesterYear } = require('../utils');
const { uploadQRBase64, destroyImageByUrl } = require('../utils/cloudinary');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const { createCanvas, loadImage } = require('canvas');
const { handleCache, setCache } = require('../configs/redis');
const { getIdCriteria, updateCriteriaScore } = require('./trainingPointController');

const createQRCode = async (data) => {
    if (!data) return null;
    try {
        const { encryptedData, iv } = encryptData(data);

        let qrBase64 = await QRCode.toDataURL(
            JSON.stringify({
                data: encryptedData,
                message: 'Scan this QR code to check in',
            }),
            {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: {
                    dark: '#0c339c',
                    light: '#fff',
                },
            }
        );
        const qrImage = await loadImage(qrBase64);
        const logoImage = await loadImage('https://i.ibb.co/T8gKWff/adaptive-icon.png');

        const canvas = createCanvas(qrImage.width, qrImage.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(qrImage, 0, 0, qrImage.width, qrImage.height);

        const logoSize = qrImage.width * 0.4; // 40% of the QR code size
        const logoX = (qrImage.width - logoSize) / 2;
        const logoY = (qrImage.height - logoSize) / 2;

        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

        const finalQRCodeBase64 = canvas.toDataURL();

        // const qrCodeUrl = await uploadQRBase64(qrBase64, data.eventCode);
        const qrCodeUrl = await uploadQRBase64(finalQRCodeBase64, data.eventCode);
        console.log('qrCodeUrl', qrCodeUrl);

        return {
            qrCodeUrl,
            iv,
        };
    } catch (error) {
        console.log('error', error);
    }
};

// [GET] /api/v1/events/get-all
const GetEvents = asyncHandler(async (req, res) => {
    let { page, size, status, time, search, semester, year, typeEvent } = req.query;
    if (!page || page < 1) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;
    const user = req.user;

    const query = {};
    const currentDate = new Date();

    const key = `events_${page ? page : ''}_${size ? size : ''}_${status ? status : ''}_${time ? time : ''}_${
        search ? search : ''
    }_${typeEvent ? typeEvent : ''}_${semester ? semester : ''}_${year ? year : ''}_${
        user.typeRole === 'user' ? user.id : ''
    }`;

    console.log('key', key);

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    if (['active', 'inactive'].includes(status)) {
        query.status = status;
    }

    if (['mandatory', 'optional'].includes(typeEvent)) {
        query.typeEvent = typeEvent;
    }

    if (time === 'past') {
        query.endAt = { $lt: currentDate };
    } else if (time === 'ongoing') {
        query.startAt = { $lte: currentDate };
        query.endAt = { $gte: currentDate };
    } else if (time === 'upcoming') {
        query.startAt = { $gt: currentDate };
    }

    if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }

    const currentSY = getCurrentSemesterYear();
    if (semester) {
        if (year) {
            const semesterYear = await SemesterYearModel.findOne({ semester: semester, year: year });
            if (!semesterYear) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Semester year not found');
            }
            query.semester = semesterYear._id;
        } else {
            const semesterYears = await SemesterYearModel.findOne({
                semester: semester,
                year: currentSY.year,
            });
            if (!semesterYears) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Semester year not found');
            }
            query.semester = semesterYears._id;
        }
    }

    let events;

    if (status === 'active') {
        if (user.typeRole === 'user') {
            events = await EventModel.find(query)
                .select('name startAt endAt eventCode createdAt thumbnail typeEvent')
                .populate('attendeesList', 'user')
                .populate('registeredAttendees', 'id username fullName email')
                .populate('post', 'title')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip);

            events = events.filter((event) => {
                if (event.typeEvent === 'mandatory') {
                    return !event.attendeesList.some((attendee) => {
                        return attendee.user.toString() === user.id;
                    });
                } else if (event.typeEvent === 'optional') {
                    const isInAttendeesList = !event.attendeesList.some((attendee) => {
                        return attendee.user.toString() === user.id;
                    });
                    const isInRegisteredAttendees = event.registeredAttendees.some((attendee) => {
                        return attendee.id === user.id;
                    });

                    return isInAttendeesList && isInRegisteredAttendees;
                }
            });
        }
    } else {
        events = await EventModel.find(query)
            .select('name startAt endAt eventCode createdAt thumbnail typeEvent')
            .populate('attendeesList', 'user')
            .populate('post', 'title')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);
    }

    const total_documents =
        status === 'active' && user.typeRole === 'user' ? events.length : await EventModel.countDocuments(query);
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    if (events.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: page,
                size: size,
                previous: previous_pages,
                next: next_pages,
                events,
            },
            900
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            events,
        },
    });
});

// [GET] /api/v1/events/:id
const getEventByIdOrCode = asyncHandler(async (req, res) => {
    const idOrCode = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrCode) ? { _id: idOrCode } : { eventCode: idOrCode.toUpperCase() };

    const key = `event_details_${idOrCode}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    const event = await EventModel.findOne(query)
        .select('-updatedAt -__v -attendeesList -registeredAttendees -semesterYear')
        .populate('author', 'fullName email')
        .populate('post', 'title');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    await setCache(key, event, 900);

    res.status(200).json({
        status: 'success',
        data: event,
    });
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
        distanceLimit = 0,
        author,
        post = null,
        thumbnail,
        typeEvent,
        semester,
        criteriaCode,
    } = req.body;

    const eventCode = 'EVENT-' + Date.now();
    if (startAt > endAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Start date must be before end date');
    }

    if (!name || !description || !endAt || !location || !author) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Name, description, end date, location,  author are required');
    }

    if (typeEvent && ['mandatory', 'optional'].includes(typeEvent) === false) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid type event');
    }

    if (typeEvent && typeEvent === 'optional' && post === null) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Post is required for optional event');
    }

    if (typeEvent && typeEvent === 'optional' && !criteriaCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Criteria code is required for optional event');
    }

    if (criteriaCode) {
        const availableCriteria = ['1.2.1', '4.4'];
        if (!availableCriteria.includes(criteriaCode)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid criteria code');
        }
    }

    let postExist;

    if (post) {
        if (!mongoose.Types.ObjectId.isValid(post)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post id');
        } else {
            postExist = await PostModel.findById(post);
            if (!postExist) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
            }
            if (postExist.event) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'This post has already been used for an event');
            }
        }
    }
    const currentSY = getCurrentSemesterYear();
    const semesterYear = await SemesterYearModel.findOne({
        year: currentSY.year,
        semester: semester || currentSY.semester,
    });

    if (!semesterYear) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Semester year not found');
    }

    const { qrCodeUrl, iv } = await createQRCode({
        eventCode,
        startAt: new Date(startAt).getTime(),
        endAt: new Date(endAt).getTime(),
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
        typeEvent,
        registeredAttendees: typeEvent === 'optional' ? [] : null,
        semesterYear: semesterYear._id,
        criteriaCode: typeEvent === 'optional' ? criteriaCode : null,
        iv,
    });

    const createdEvent = await event.save();

    await postExist.updateOne({ event: createdEvent._id });

    if (!createdEvent) {
        await destroyImageByUrl(qrCodeUrl);
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Create event failed');
    }

    res.status(201).json({
        status: 'success',
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
    const typeEvent = req.body.typeEvent;
    const criteriaCode = req.body.criteriaCode;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid event id');
    }

    const event = await EventModel.findById(req.params.id);

    // check if event is ongoing
    const currentDate = new Date();
    if (currentDate > event.startAt && currentDate < event.endAt) {
        console.log('endAt', event.endAt);
        console.log('startAt', event.startAt);
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot update event while it is ongoing');
    }

    if (criteriaCode) {
        const availableCriteria = ['1.2.1', '4.4'];
        if (!availableCriteria.includes(criteriaCode)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid criteria code');
        }
    }

    if (!startAt && !endAt) {
        event.thumbnail = thumbnail || event.thumbnail;
        event.post = post || event.post;
        event.name = name || event.name;
        event.description = description || event.description;
        event.maxAttendees = maxAttendees || event.maxAttendees;
        event.location = location || event.location;
        event.distanceLimit = distanceLimit === undefined ? event.distanceLimit : distanceLimit;
        event.typeEvent = typeEvent || event.typeEvent;
        event.criteriaCode = criteriaCode || event.criteriaCode;

        const updatedEvent = await event.save();
        return res.status(200).json({
            status: 'success',
            data: updatedEvent,
        });
    }

    if (startAt > endAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Start date must be before end date');
    }

    const newEventCode = 'EVENT-' + Date.now();

    const result = await destroyImageByUrl(event.qrCodeUrl);

    const { qrCodeUrl, iv } = await createQRCode({
        eventCode: newEventCode,
        startAt: new Date(startAt).getTime(),
        endAt: new Date(endAt).getTime(),
    });

    event.eventCode = newEventCode;
    event.name = name || event.name;
    event.description = description || event.description;
    event.startAt = startAt || event.startAt;
    event.endAt = endAt || event.endAt;
    event.maxAttendees = maxAttendees || event.maxAttendees;
    event.location = location || event.location;
    event.distanceLimit = distanceLimit === undefined ? event.distanceLimit : distanceLimit;
    event.qrCodeUrl = qrCodeUrl || event.qrCodeUrl;
    event.thumbnail = thumbnail || event.thumbnail;
    event.post = post || event.post;
    event.typeEvent = typeEvent || event.typeEvent;
    event.iv = iv || event.iv;
    event.criteriaCode = criteriaCode || event.criteriaCode;

    const updatedEvent = await event.save();

    res.status(200).json({
        status: 'success',
        data: updatedEvent,
    });
});

// [DELETE] /api/v1/events/:id
const DeleteEvent = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.typeRole !== 'admin') {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to delete event');
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid event id');
    }

    const event = await EventModel.findById(req.params.id);
    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    const result = await destroyImageByUrl(event.qrCodeUrl);
    if (result.result !== 'ok') {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Delete old QR code failed');
    }

    // delete all attendance of this event
    await event.deleteOne();
    await AttendanceModel.deleteMany({ event: req.params.id });

    res.status(200).json({
        status: 'success',
        data: null,
    });
});

// [GET] /api/v1/events/:id/attendees
const GetAttendeesList = asyncHandler(async (req, res) => {
    let { status, page, size } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `attendees_${req.params.id}_${status}_${page}_${size}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    let query = {};

    if (['pending', 'approved', 'rejected'].includes(status)) {
        query.status = status;
    }

    const event = await EventModel.findById(req.params.id)
        .populate({ path: 'attendeesList', match: query, select: '-updatedAt -__v -createdAt', limit, skip })
        .select('attendeesList');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    const total_documents = event.attendeesList.length;
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    await setCache(
        key,
        {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            attendees: event.attendeesList,
        },
        900
    );

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            attendees: event.attendeesList,
        },
    });
});

// [GET] /api/v1/events/:id/registeredAttendees
const GetRegisteredAttendeesList = asyncHandler(async (req, res) => {
    let { page, size } = req.query;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `attendees_${req.params.id}_${page}_${size}`;
    const value = await handleCache(key);

    if (value) {
        return res.status(200).json({
            status: 'success',
            data: value,
        });
    }

    const event = await EventModel.findById(req.params.id)
        .populate({ path: 'registeredAttendees', select: '-updatedAt -__v ', limit, skip })
        .select('registeredAttendees');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    if (event.typeEvent === 'mandatory') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'This event is not optional');
    }

    const total_documents = event.registeredAttendees.length;
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    await setCache(
        key,
        {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            registered: event.registeredAttendees,
        },
        900
    );

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            registered: event.registeredAttendees,
        },
    });
});

// [POST] /api/v1/events/:id/register
const RegisterEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const event = await EventModel.findById(id).populate('registeredAttendees');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    if (event.typeEvent === 'mandatory') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'This event is not optional');
    }

    if (event.registeredAttendees.length === event.maxAttendees) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Event has reached maximum attendees');
    }

    if (event.registeredAttendees.some((attendee) => attendee.id === user.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already registered for this event');
    }

    event.registeredAttendees.push(user.id);
    await event.save();

    res.status(200).json({
        status: 'success',
        data: event,
    });
});

// [POST] /api/v1/events/:id/unregister
const UnregisterEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const event = await EventModel.findById(id).populate('registeredAttendees');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    if (event.typeEvent === 'mandatory') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'This event is not optional');
    }

    if (!event.registeredAttendees.some((attendee) => attendee.id === user.id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You have not registered for this event');
    }

    event.registeredAttendees = event.registeredAttendees.filter((attendee) => attendee.id !== user.id);
    await event.save();

    res.status(200).json({
        status: 'success',
        data: event,
    });
});

// [POST] /api/v1/events/:id/check-in
const CheckInEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let userReq = req.user;
    let { location, checkInAt, userId, distance, encryptedData } = req.body;
    let criteriaId;
    if (userReq.typeRole !== 'user') {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to check in');
    }
    if (userReq.id !== userId) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to check in for other users');
    }

    if (!checkInAt) {
        checkInAt = Date.now();
    }

    if (!encryptedData) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Encrypted data is required');
    }

    const event = await EventModel.findById(id).populate('registeredAttendees');

    if (!event) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Event not found');
    }

    if (event.typeEvent === 'optional') {
        if (event.registeredAttendees.length === 0) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'You have not registered for this event');
        }

        if (event.attendeesList.length === event.maxAttendees) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Event has reached maximum attendees');
        }

        if (!event.registeredAttendees.some((attendee) => attendee.id === userId)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not registered for this event');
        }
        criteriaId = await getIdCriteria(event.criteriaCode, userId, event.semesterYear);
        if (!criteriaId) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'You have not met the criteria for this event yet');
        }
    }

    if (event.attendeesList.length >= event.maxAttendees) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Event has reached maximum attendees');
    }

    if (checkInAt < event.startAt || checkInAt > event.endAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid check in time');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const { decryptedData, iv } = decryptData(encryptedData);

    if (decryptedData.eventCode !== event.eventCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid event code');
    }

    if (decryptedData.startAt > checkInAt || decryptedData.endAt < checkInAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid check in time');
    }

    if (iv !== event.iv) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid QR code');
    }

    const attendance = await AttendanceModel.findOne({ event: id, user: req.user._id });

    if (attendance) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already checked in');
    }

    await AttendanceModel.create({
        event: id,
        user: userId,
        checkInAt,
        location,
        semesterYear: event.semesterYear,
        distance: distance || 0,
    })
        .then(async (newAttendance) => {
            event.attendeesList.push(newAttendance._id);
            event.save();

            if (event.typeEvent === 'optional') {
                await updateCriteriaScore(criteriaId, 2);
            }

            res.status(200).json({
                status: 'success',
                data: newAttendance,
            });
        })
        .catch((error) => {
            if (error.code === 11000) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'You have already checked in');
            }
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
        });
});

// [PUT] /api/v1/attendances/:id
const UpdateStatusAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const attendance = await AttendanceModel.findById(id);

    if (!attendance) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Attendance not found');
    }

    if (status === 'approved') {
        attendance.status = status;
    } else if (status === 'rejected') {
        attendance.status = status;
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status');
    }

    const updatedAttendance = await attendance.save();

    res.status(200).json({
        status: 'success',
        data: updatedAttendance,
    });
});

// [GET] /api/v1/users/:id/attendance
const GetAttendancesByUser = asyncHandler(async (req, res) => {
    let { status, page, size, semester, year } = req.query;
    const userReq = req.user;

    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let queryAttendances = {};
    const idOrUsername = req.params.id;

    const query = mongoose.Types.ObjectId.isValid(idOrUsername) ? { _id: idOrUsername } : { username: idOrUsername };

    if (['pending', 'approved', 'rejected'].includes(status)) {
        queryAttendances.status = status;
    }

    const user = await UserModel.findOne(query).select('_id');

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (userReq.typeRole === 'user' && userReq.id !== user.id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to access this route');
    }

    if (semester) {
        const currentSY = getCurrentSemesterYear();
        if (year) {
            const semesterYear = await SemesterYearModel.findOne({ semester: semester, year: year });
            if (!semesterYear) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Semester year not found');
            }
            queryAttendances.semesterYear = semesterYear._id;
        } else {
            const semesterYears = await SemesterYearModel.findOne({
                semester: semester,
                year: currentSY.year,
            });
            if (!semesterYears) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Semester year not found');
            }
            queryAttendances.semesterYear = semesterYears._id;
        }
    }

    const attendances = await AttendanceModel.find({ user: user._id, ...queryAttendances })
        .select('-updatedAt -__v -createdAt')
        .limit(limit)
        .skip(skip)
        .populate('event', 'name startAt endAt location eventCode')
        .populate('user', 'fullName username email');

    const total_documents = attendances.length;
    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            attendances,
        },
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
    GetAttendancesByUser,
    GetRegisteredAttendeesList,
    RegisterEvent,
    UnregisterEvent,
};
