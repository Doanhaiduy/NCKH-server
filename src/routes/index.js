const express = require('express');
const ROUTES = require('../constants/routes');
const Router = express.Router();

const AuthRouter = require('./authRouter');
const UsersRouter = require('./userRouter');
const PostRouter = require('./postRouter');
const RoleRouter = require('./roleRouter');

const routerConfig = () => {
    Router.use(ROUTES.AUTH.ROOT, AuthRouter);
    Router.use(ROUTES.USER.ROOT, UsersRouter);
    Router.use(ROUTES.POST.ROOT, PostRouter);
    Router.use(ROUTES.UTILS.ROOT, RoleRouter);
    return Router;
};

module.exports = routerConfig;
