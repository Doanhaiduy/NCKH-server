const express = require('express');
const Router = express.Router();
const { GetUsers } = require('../controllers/userController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.get(ROUTES.USER.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetUsers);

module.exports = Router;
