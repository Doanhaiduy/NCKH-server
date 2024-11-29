const express = require('express');

const Router = express.Router();

const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const { GetFeedbacks, CreateFeedback, GetFeedbackById, DeleteFeedback } = require('../controllers/feedbackController');

Router.get(ROUTES.FEEDBACK.GET_ALL, [checkAuth, checkRole([ROLES.USER])], GetFeedbacks);
Router.post(ROUTES.FEEDBACK.CREATE, [checkAuth, checkRole([ROLES.USER])], CreateFeedback);
Router.get(ROUTES.FEEDBACK.ID, [checkAuth, checkRole([ROLES.USER])], GetFeedbackById);
Router.delete(ROUTES.FEEDBACK.DELETE, [checkAuth, checkRole([ROLES.USER])], DeleteFeedback);

module.exports = Router;
