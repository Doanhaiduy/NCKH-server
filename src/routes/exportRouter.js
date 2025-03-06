const express = require('express');
const ROUTES = require('../constants/routes');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const {
    exportEventData,
    exportStudentsList,
    exportEventsList,
    exportPostsList,
    exportFeedbacksList,
    exportTrainingPointList,
    exportTrainingPointListByClass,
    exportTrainingPointListByUser,
    exportTrainingPointById,
} = require('../controllers/exportController');
const Router = express.Router();

Router.get(ROUTES.EXPORT.EXPORT_EVENT_DATA, [checkAuth, checkRole([ROLES.ADMIN])], exportEventData);
Router.get(ROUTES.EXPORT.EXPORT_USER_LIST, [checkAuth, checkRole([ROLES.ADMIN])], exportStudentsList);
Router.get(ROUTES.EXPORT.EXPORT_EVENT_LIST, [checkAuth, checkRole([ROLES.ADMIN])], exportEventsList);
Router.get(ROUTES.EXPORT.EXPORT_POST_LIST, [checkAuth, checkRole([ROLES.ADMIN])], exportPostsList);
Router.get(ROUTES.EXPORT.EXPORT_FEEDBACK_LIST, [checkAuth, checkRole([ROLES.ADMIN])], exportFeedbacksList);
Router.get(ROUTES.EXPORT.EXPORT_TRAINING_POINT_LIST, [checkAuth, checkRole([ROLES.ADMIN])], exportTrainingPointList);
Router.get(
    ROUTES.EXPORT.EXPORT_TRAINING_POINT_LIST_BY_CLASS,
    [checkAuth, checkRole([ROLES.ADMIN])],
    exportTrainingPointListByClass,
);
Router.get(
    ROUTES.EXPORT.EXPORT_TRAINING_POINT_LIST_BY_USER,
    [checkAuth, checkRole([ROLES.ADMIN])],
    exportTrainingPointListByUser,
);
Router.get(ROUTES.EXPORT.EXPORT_TRAINING_POINT_BY_ID, [checkAuth, checkRole([ROLES.ADMIN])], exportTrainingPointById);

module.exports = Router;
