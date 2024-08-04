const express = require('express');
const Router = express.Router();
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const { CreateTrainingPoint, GetAllTrainingPoint } = require('../controllers/trainingPointController');

Router.get(ROUTES.TRAINING_POINT.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAllTrainingPoint);
Router.post(ROUTES.TRAINING_POINT.CREATE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], CreateTrainingPoint);

module.exports = Router;
