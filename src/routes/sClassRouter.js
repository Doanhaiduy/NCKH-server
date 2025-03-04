const express = require('express');

const Router = express.Router();

const {
    GetAllClasses,
    GetClassById,
    UpdateClassById,
    DeleteClassById,
    CreateClass,
    GetAllStudentsByClassId,
} = require('../controllers/sclassController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.get(ROUTES.SCLASS.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAllClasses);
Router.get(ROUTES.SCLASS.GET_ALL_STUDENTS, [checkAuth, checkRole([ROLES.ADMIN])], GetAllStudentsByClassId);
Router.get(ROUTES.SCLASS.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetClassById);
Router.put(ROUTES.SCLASS.UPDATE, [checkAuth, checkRole([ROLES.ADMIN])], UpdateClassById);
Router.delete(ROUTES.SCLASS.ID, [checkAuth, checkRole([ROLES.ADMIN])], DeleteClassById);
Router.post(ROUTES.SCLASS.CREATE, [checkAuth, checkRole([ROLES.ADMIN])], CreateClass);

module.exports = Router;
