const express = require('express');
const Router = express.Router();
const { GetPostById, CreatePost, GetPosts } = require('../controllers/postController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.get(ROUTES.POST.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetPosts);
Router.get(ROUTES.POST.GET_BY_ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetPostById);
Router.post(ROUTES.POST.CREATE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], CreatePost);

module.exports = Router;
