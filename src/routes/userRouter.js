const express = require('express');
const Router = express.Router();
const { GetUsers, getUserByIdOrUsername, UpdateUser } = require('../controllers/userController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const { GetAttendanceByUser } = require('../controllers/eventController');

Router.get(ROUTES.USER.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetUsers);
Router.get(ROUTES.USER.GET_ATTENDANCE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAttendanceByUser);
Router.get(ROUTES.USER.ID, [checkAuth, checkRole([ROLES.USER])], getUserByIdOrUsername);
Router.put(ROUTES.USER.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], UpdateUser);
module.exports = Router;
