const express = require('express');
const Router = express.Router();

const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const {
    GetRegisterEventStatistics,
    GetAttendeesEventStatistics,
    GetOverviewForDashboard,
    GetTopStudent,
} = require('../controllers/statisticsController');

Router.get(ROUTES.STATISTICS.GET_REGISTERED_EVENTS, [checkAuth, checkRole([ROLES.ADMIN])], GetRegisterEventStatistics);
Router.get(ROUTES.STATISTICS.GET_ATTENDEES_EVENTS, [checkAuth, checkRole([ROLES.ADMIN])], GetAttendeesEventStatistics);
Router.get(ROUTES.STATISTICS.GET_OVERVIEW_DASHBOARD, [checkAuth, checkRole([ROLES.ADMIN])], GetOverviewForDashboard);
Router.get(ROUTES.STATISTICS.GET_TOP_STUDENTS, [checkAuth, checkRole([ROLES.ADMIN])], GetTopStudent);

module.exports = Router;
