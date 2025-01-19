const schedule = require('node-schedule');
const { createNotificationHandler } = require('../controllers/notificationController');
const EventModel = require('../models/eventModel');
const { getAllUserIds } = require('../services/userService');

const scheduleJobNotification = ({ sender, getReceiver, message, type, description, dateTime }) => {
    schedule.scheduleJob(dateTime, () => {
        createNotificationHandler({ sender, getReceiver, message, type, description });
    });
};

const getEventReceivers = async (eventId) => {
    const event = await EventModel.findById(eventId).select('typeEvent registeredAttendees').lean();

    if (!event) {
        return [];
    }

    if (event.typeEvent === 'mandatory') {
        const receivers = await getAllUserIds('user');
        return receivers;
    } else {
        const receivers = event.registeredAttendees.map((attendee) => attendee.toString());
        return receivers;
    }
};

const getTrainingPointGradeReceivers = async () => {
    const receivers = await getAllUserIds('user');
    return receivers;
};

const scheduleEventNotifications = ({ eventId, startAt, name, author }) => {
    const currentTime = new Date().getTime();
    const eventStartTime = new Date(startAt).getTime();
    const timeUntilEvent = eventStartTime - currentTime;

    if (timeUntilEvent <= 0) {
        console.log(`Sự kiện ${name} đã bắt đầu. Không thể lên lịch thông báo.`);
        return;
    }

    if (timeUntilEvent <= 30 * 60 * 1000) {
        console.log(`Sự kiện ${name} sắp bắt đầu. Gửi thông báo ngay lập tức.`);
        scheduleJobNotification({
            sender: author,
            getReceiver: () => getEventReceivers(eventId),
            message: `Sự kiện ${name} sẽ bắt đầu sau ít phút!`,
            type: 'event',
            description: `Sự kiện ${name} sắp bắt đầu. Hãy chuẩn bị sẵn sàng tham gia!`,
            dateTime: new Date(),
        });

        scheduleJobNotification({
            sender: author,
            getReceiver: () => getEventReceivers(eventId),
            message: `Sự kiện ${name} đã bắt đầu!`,
            type: 'event',
            description: `Sự kiện ${name} vừa bắt đầu. Hãy tham gia ngay để không bỏ lỡ bất kỳ nội dung quan trọng nào!`,
            dateTime: new Date(eventStartTime),
        });
    } else {
        console.log(`Lên lịch thông báo trước 30 phút và khi sự kiện ${name} bắt đầu.`);

        scheduleJobNotification({
            sender: author,
            getReceiver: () => getEventReceivers(eventId),
            message: `Sự kiện ${name} sẽ bắt đầu sau 30 phút!`,
            type: 'event',
            description: `Hãy chuẩn bị sẵn sàng tham gia sự kiện ${name}. Đừng bỏ lỡ nhé!`,
            dateTime: new Date(eventStartTime - 30 * 60 * 1000),
        });

        scheduleJobNotification({
            sender: author,
            getReceiver: () => getEventReceivers(eventId),
            message: `Sự kiện ${name} đã bắt đầu!`,
            type: 'event',
            description: `Sự kiện ${name} vừa bắt đầu. Hãy tham gia ngay để không bỏ lỡ bất kỳ nội dung quan trọng nào!`,
            dateTime: new Date(eventStartTime),
        });
    }
};

const scheduleTrainingPointGradeNotifications = ({ startAt, name, author }) => {
    const currentTime = new Date().getTime();
    const eventStartTime = new Date(startAt).getTime();
    const timeUntilEvent = eventStartTime - currentTime;

    if (timeUntilEvent <= 0) {
        console.log(`Thời gian đánh giá điểm rèn luyện "${name}" đã bắt đầu hoặc kết thúc.`);
        return;
    }

    if (timeUntilEvent <= 30 * 60 * 1000) {
        console.log(`Đánh giá điểm rèn luyện "${name}" sắp bắt đầu. Gửi thông báo ngay lập tức.`);

        scheduleJobNotification({
            sender: author,
            getReceiver: getTrainingPointGradeReceivers,
            message: `Đánh giá điểm rèn luyện "${name}" sẽ bắt đầu trong ít phút!`,
            type: 'training-point',
            description: `Thời gian đánh giá điểm rèn luyện "${name}" sắp bắt đầu. Hãy kiểm tra và chuẩn bị đầy đủ trước khi đánh giá!`,
            dateTime: new Date(),
        });

        // Thông báo bắt đầu
        scheduleJobNotification({
            sender: author,
            getReceiver: getTrainingPointGradeReceivers,
            message: `Đánh giá điểm rèn luyện "${name}" đã bắt đầu!`,
            type: 'training-point',
            description: `Thời gian đánh giá điểm rèn luyện "${name}" đã mở. Hãy tham gia đánh giá ngay!`,
            dateTime: new Date(eventStartTime),
        });
    } else {
        // Lên lịch gửi thông báo trước 30 phút
        console.log(`Lên lịch thông báo đánh giá điểm rèn luyện "${name}" trước 30 phút và khi bắt đầu.`);

        scheduleJobNotification({
            sender: author,
            getReceiver: getTrainingPointGradeReceivers,
            message: `Đánh giá điểm rèn luyện "${name}" sẽ bắt đầu sau 30 phút.`,
            type: 'training-point',
            description: `Thời gian đánh giá điểm rèn luyện "${name}" sắp bắt đầu. Hãy kiểm tra và chuẩn bị đầy đủ trước khi đánh giá!`,
            dateTime: new Date(eventStartTime - 30 * 60 * 1000),
        });

        // Lên lịch thông báo khi bắt đầu
        scheduleJobNotification({
            sender: author,
            getReceiver: getTrainingPointGradeReceivers,
            message: `Đánh giá điểm rèn luyện "${name}" đã bắt đầu!`,
            type: 'training-point',
            description: `Thời gian đánh giá điểm rèn luyện "${name}" đã mở. Hãy tham gia đánh giá ngay!`,
            dateTime: new Date(eventStartTime),
        });
    }
};

module.exports = {
    scheduleEventNotifications,
    scheduleTrainingPointGradeNotifications,
    getEventReceivers,
};
// create a notification every 10 seconds when:
// - has event with status 'approved'
// - has event with status 'pending'
// - has event with status 'rejected'
