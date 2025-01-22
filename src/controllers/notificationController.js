const asyncHandle = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');
const { Expo } = require('expo-server-sdk');
const { handleCache, setCache } = require('../configs/redis');

const PushNotification = asyncHandle(async ({ data, somePushTokens }) => {
    let expo = new Expo();
    let messages = [];
    let countSuccess = 0;

    for (let pushToken of somePushTokens) {
        if (!pushToken) {
            console.error('Push token is not available');
            continue;
        }
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title: data.title,
            body: data.description,
            data: { withSome: 'data' },
        });
    }

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    })();
    console.log(
        `Successfully push ${countSuccess} messages, unsuccessfully push ${messages.length - countSuccess} messages`
    );
});

// [GET] /api/v1/notifications/get-all
const GetAllNotifications = asyncHandle(async (req, res) => {
    let { page, size, time, search } = req.query;
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const key = `notifications_${page ? page : ''}_${size ? size : ''}_${search ? search : ''}`;

    const value = await handleCache(key);

    if (value) {
        return res.status(StatusCodes.OK).json({
            status: 'success',
            data: value,
        });
    }

    const query = {};
    const currentDate = new Date();

    const notifications = await NotificationModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean();

    const total_documents = await NotificationModel.countDocuments(query);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    if (notifications.length !== 0) {
        await setCache(
            key,
            {
                total: total_documents,
                page: page,
                size: size,
                previous: previous_pages,
                next: next_pages,
                notifications,
            },
            900
        );
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            total: total_documents,
            page: page,
            size: size,
            previous: previous_pages,
            next: next_pages,
            notifications,
        },
    });
});

// [GET] /api/v1/notifications/:id
const GetNotificationById = asyncHandle(async (req, res) => {
    const notification = await NotificationModel.findById(req.params.id).lean();

    if (!notification) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: notification,
    });
});

// [GET] /api/v1/users/:id/notifications
const GetUserNotifications = asyncHandle(async (req, res) => {
    const { id } = req.params;
    const userReq = req.user;
    const user = await UserModel.findById(id).lean();

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (userReq.typeRole === 'user' && userReq.id.toString() !== id) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to access this resource');
    }

    const notifications = await NotificationModel.find({ receiver: id })
        .sort({ createdAt: -1 })
        .select('-receiver -updatedAt -__v')
        .lean();
    const result = notifications.map((notification) => {
        const isRead = notification.readBy.some((reader) => reader.readerId.toString() === id);
        return {
            ...notification,
            isRead,
            readBy: undefined,
        };
    });

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
    });
});

// [POST] /api/v1/notifications
const createNotificationHandler = async ({ sender, getReceiver, message, type, description }) => {
    if (!sender || !getReceiver || !message || !type) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Please fill all the fields');
    }
    let receiver = [];
    // check type getReceiver is array
    if (Array.isArray(getReceiver)) {
        receiver = getReceiver;
    } else {
        receiver = await getReceiver();
    }

    if (receiver.length === 0) {
        return {
            message: 'No receiver found',
        };
    }

    const notification = new NotificationModel({
        sender,
        receiver,
        message,
        type,
        description,
    });

    await notification.save();
    await notification.populate('receiver');

    const somePushTokens = notification.receiver.map((receiver) => receiver.expoPushToken);

    await PushNotification({ data: { title: message, description }, somePushTokens });

    return notification;
};

const CreateNotification = asyncHandle(async (req, res) => {
    const { sender, receiver, message, type, description } = req.body;

    const notification = await createNotificationHandler({ sender, getReceiver: receiver, message, type, description });

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: notification,
    });
});

// [PUT] /api/v1/notifications/:id
const UpdateNotification = asyncHandle(async (req, res) => {
    const { sender, receiver, message, type } = req.body;
    const notification = await NotificationModel.findById(req.params.id);

    if (!notification) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    notification.sender = sender || notification.sender;
    notification.receiver = receiver || notification.receiver;
    notification.message = message || notification.message;
    notification.type = type || notification.type;

    await notification.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: notification,
    });
});

// [PUT] /api/v1/notifications/:id/read/:userId
const ReadNotification = asyncHandle(async (req, res) => {
    const { id, userId } = req.params;
    const notification = await NotificationModel.findById(id);

    if (!notification) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    const user = UserModel.findById(userId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // receiver is array of user ids
    const isReceiver = notification.receiver.some((receiver) => receiver.toString() === userId);
    if (!isReceiver) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a receiver of this notification');
    }

    const isRead = notification.readBy.some((reader) => reader.readerId.toString() === userId);
    if (isRead) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Notification already read');
    }

    notification.readBy.push({ readerId: userId, readAt: Date.now() });

    await notification.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: notification,
    });
});

// [DELETE] /api/v1/notifications/:id
const DeleteNotification = asyncHandle(async (req, res) => {
    const notification = await NotificationModel.findById(req.params.id);

    if (!notification) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    await notification.remove();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
            message: 'Notification deleted successfully',
        },
    });
});

module.exports = {
    GetAllNotifications,
    GetNotificationById,
    createNotificationHandler,
    CreateNotification,
    UpdateNotification,
    DeleteNotification,
    ReadNotification,
    GetUserNotifications,
};
