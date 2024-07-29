const express = require('express');
const ROUTES = require('../constants/routes');
const {
    CreateEvent,
    GetEvents,
    getEventByIdOrCode,
    UpdateEvent,
    DeleteEvent,
    GetAttendeesList,
    CheckInEvent,
} = require('../controllers/eventController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const Router = express.Router();

Router.get(ROUTES.EVENT.GET_ALL, [checkAuth, checkRole([ROLES.USER])], GetEvents);
Router.get(ROUTES.EVENT.GET_ATTENDEES, [checkAuth, checkRole([ROLES.USER])], GetAttendeesList);
Router.get(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.USER])], getEventByIdOrCode);
Router.post(ROUTES.EVENT.CREATE, [checkAuth, checkRole([ROLES.USER, ROLES.ADMIN])], CreateEvent);
Router.post(ROUTES.EVENT.CHECK_IN, [checkAuth, checkRole([ROLES.USER])], CheckInEvent);
Router.put(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.USER, ROLES.ADMIN])], UpdateEvent);
Router.delete(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.USER, ROLES.ADMIN])], DeleteEvent);

module.exports = Router;
