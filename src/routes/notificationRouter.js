const express = require('express');

const Router = express.Router();
const {
    GetAllNotifications,
    GetNotificationById,
    CreateNotification,
    UpdateNotification,
    DeleteNotification,
    ReadNotification,
} = require('../controllers/notificationController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.get(ROUTES.NOTIFICATION.GET_ALL, checkAuth, checkRole([ROLES.ADMIN, ROLES.USER]), GetAllNotifications);
Router.get(ROUTES.NOTIFICATION.ID, checkAuth, checkRole([ROLES.ADMIN, ROLES.USER]), GetNotificationById);
Router.post(ROUTES.NOTIFICATION.CREATE, checkAuth, checkRole([ROLES.ADMIN]), CreateNotification);
Router.put(ROUTES.NOTIFICATION.READ, checkAuth, checkRole([ROLES.ADMIN, ROLES.USER]), ReadNotification);
Router.put(ROUTES.NOTIFICATION.UPDATE, checkAuth, checkRole([ROLES.ADMIN]), UpdateNotification);
Router.delete(ROUTES.NOTIFICATION.ID, checkAuth, checkRole([ROLES.ADMIN]), DeleteNotification);

module.exports = Router;
