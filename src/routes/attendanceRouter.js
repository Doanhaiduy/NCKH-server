const express = require('express');
const ROUTES = require('../constants/routes');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const { UpdateStatusAttendance } = require('../controllers/eventController');
const Router = express.Router();

Router.put(ROUTES.ATTENDANCE.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], UpdateStatusAttendance);

module.exports = Router;
