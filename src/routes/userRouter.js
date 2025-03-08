const express = require('express');
const Router = express.Router();
const {
    GetUsers,
    getUserByIdOrUsername,
    UpdateUser,
    DeleteUser,
    GetUsersByClassId,
} = require('../controllers/userController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const { GetAttendancesByUser } = require('../controllers/eventController');
const { GetTrainingPointsByUserId } = require('../controllers/trainingPointController');
const upload = require('../configs/multer');
const { UploadSingle, UploadMultiple } = require('../controllers/userController');
const { GetUserNotifications } = require('../controllers/notificationController');

Router.get(ROUTES.USER.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN])], GetUsers);
Router.get(ROUTES.USER.GET_BY_CLASS_ID, [checkAuth, checkRole([ROLES.ADMIN])], GetUsersByClassId);
Router.get(ROUTES.USER.GET_ATTENDANCE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAttendancesByUser);
Router.get(
    ROUTES.USER.GET_TRAINING_POINTS,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    GetTrainingPointsByUserId,
);
Router.get(ROUTES.USER.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], getUserByIdOrUsername);
Router.get(ROUTES.USER.GET_NOTIFICATIONS, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetUserNotifications);

Router.post(
    ROUTES.USER.UPLOAD,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.single('image'),
    UploadSingle,
);
Router.post(
    ROUTES.USER.UPLOAD_MULTIPLE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.array('images', 10),
    UploadMultiple,
);
Router.put(ROUTES.USER.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], UpdateUser);
Router.delete(ROUTES.USER.ID, [checkAuth, checkRole([ROLES.ADMIN])], DeleteUser);

module.exports = Router;
