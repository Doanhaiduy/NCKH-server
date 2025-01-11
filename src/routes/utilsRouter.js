const express = require('express');
const {
    GetSemesterYears,
    CreateSemesterYear,
    GetSemesterYear,
    UpdateSemesterYear,
} = require('../controllers/utilsController');
const Router = express.Router();

const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');

Router.get(ROUTES.UTILS.GET_SEMESTER_YEARS, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetSemesterYears);
Router.get(ROUTES.UTILS.GET_SEMESTER_YEAR, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetSemesterYear);
Router.post(ROUTES.UTILS.CREATE_SEMESTER_YEAR, [checkAuth, checkRole([ROLES.ADMIN])], CreateSemesterYear);
Router.put(ROUTES.UTILS.UPDATE_SEMESTER_YEAR, [checkAuth, checkRole([ROLES.ADMIN])], UpdateSemesterYear);

module.exports = Router;
