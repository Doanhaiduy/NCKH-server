const express = require('express');

const Router = express.Router();

const { SetNewRole } = require('../controllers/roleController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const Roles = require('../constants/roles');

Router.post('/set-new-role', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], SetNewRole);

module.exports = Router;
