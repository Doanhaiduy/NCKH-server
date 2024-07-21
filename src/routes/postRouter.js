const express = require('express');
const { GetPostById, CreatePost, GetPosts } = require('../controllers/postController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const Roles = require('../constants/roles');
const Router = express.Router();

Router.get('/get-all', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], GetPosts);
Router.get('/:id', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], GetPostById);
Router.post('/create', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], CreatePost);

module.exports = Router;
