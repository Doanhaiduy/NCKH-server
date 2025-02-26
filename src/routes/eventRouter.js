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
    GetRegisteredAttendeesList,
    RegisterEvent,
    UnregisterEvent,
    GetPastEvents,
    GetTodayEvents,
} = require('../controllers/eventController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const Router = express.Router();

Router.get(ROUTES.EVENT.GET_PAST_EVENT, [checkAuth, checkRole([ROLES.ADMIN])], GetPastEvents);
Router.get(ROUTES.EVENT.GET_TODAY_EVENTS, [checkAuth, checkRole([ROLES.ADMIN])], GetTodayEvents);
Router.get(ROUTES.EVENT.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetEvents);
Router.get(ROUTES.EVENT.GET_ATTENDEES, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAttendeesList);
Router.get(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], getEventByIdOrCode);
Router.get(ROUTES.EVENT.GET_REGISTERED_ATTENDEES, [checkAuth, checkRole([ROLES.ADMIN])], GetRegisteredAttendeesList);
Router.post(ROUTES.EVENT.CREATE, [checkAuth, checkRole([ROLES.ADMIN])], CreateEvent);
Router.post(ROUTES.EVENT.CHECK_IN, [checkAuth, checkRole([ROLES.USER])], CheckInEvent);
Router.post(ROUTES.EVENT.REGISTER_EVENT, [checkAuth, checkRole([ROLES.USER])], RegisterEvent);
Router.post(ROUTES.EVENT.UNREGISTER_EVENT, [checkAuth, checkRole([ROLES.USER])], UnregisterEvent);
Router.put(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.ADMIN])], UpdateEvent);
Router.delete(ROUTES.EVENT.ID, [checkAuth, checkRole([ROLES.ADMIN])], DeleteEvent);

module.exports = Router;
