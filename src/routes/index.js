const express = require('express');
const ROUTES = require('../constants/routes');
const Router = express.Router();

const AuthRouter = require('./authRouter');
const UsersRouter = require('./userRouter');
const PostRouter = require('./postRouter');
const EventRouter = require('./eventRouter');
const TrainingPointRouter = require('./trainingPointRouter');
const AttendanceRouter = require('./attendanceRouter');
const SClassRouter = require('./sClassRouter');
const RoleRouter = require('./roleRouter');
const NotificationRouter = require('./notificationRouter');
const FeedbackRouter = require('./feedbackRouter');
const UtilsRouter = require('./utilsRouter');
const StatisticsRouter = require('./statisticsRouter');
const ExportRouter = require('./exportRouter');

const routerConfig = () => {
    Router.use(ROUTES.AUTH.ROOT, AuthRouter);
    Router.use(ROUTES.USER.ROOT, UsersRouter);
    Router.use(ROUTES.EVENT.ROOT, EventRouter);
    Router.use(ROUTES.ATTENDANCE.ROOT, AttendanceRouter);
    Router.use(ROUTES.POST.ROOT, PostRouter);
    Router.use(ROUTES.TRAINING_POINT.ROOT, TrainingPointRouter);
    Router.use(ROUTES.SCLASS.ROOT, SClassRouter);
    Router.use(ROUTES.ROLE.ROOT, RoleRouter);
    Router.use(ROUTES.NOTIFICATION.ROOT, NotificationRouter);
    Router.use(ROUTES.FEEDBACK.ROOT, FeedbackRouter);
    Router.use(ROUTES.UTILS.ROOT, UtilsRouter);
    Router.use(ROUTES.STATISTICS.ROOT, StatisticsRouter);
    Router.use(ROUTES.EXPORT.ROOT, ExportRouter);
    return Router;
};

module.exports = routerConfig;
