const express = require('express');
const Router = express.Router();
const { GetPostById, CreatePost, GetPosts, UpdatePost, DeletePost } = require('../controllers/postController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.get(ROUTES.POST.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetPosts);
Router.get(ROUTES.POST.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetPostById);
Router.post(ROUTES.POST.CREATE, [checkAuth, checkRole([ROLES.ADMIN])], CreatePost);
Router.put(ROUTES.POST.ID, [checkAuth, checkRole([ROLES.ADMIN])], UpdatePost);
Router.delete(ROUTES.POST.ID, [checkAuth, checkRole([ROLES.ADMIN])], DeletePost);

module.exports = Router;
