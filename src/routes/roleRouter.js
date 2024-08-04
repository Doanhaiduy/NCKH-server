const express = require('express');

const Router = express.Router();

const { SetNewRole } = require('../controllers/roleController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.post(ROUTES.UTILS.SET_NEW_ROLE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], SetNewRole);

module.exports = Router;
