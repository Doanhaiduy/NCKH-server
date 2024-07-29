const express = require('express');
const Router = express.Router();
const {
    Login,
    Register,
    SendResetPasswordEmail,
    ResetPassword,
    ChangePassword,
    RefreshToken,
    Logout,
} = require('../controllers/authController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

Router.post(ROUTES.AUTH.LOGIN, Login);
Router.post(ROUTES.AUTH.REGISTER, Register);
Router.post(ROUTES.AUTH.SEND_RESET_PASSWORD_EMAIL, SendResetPasswordEmail);
Router.post(ROUTES.AUTH.RESET_PASSWORD, ResetPassword);
Router.post(ROUTES.AUTH.CHANGE_PASSWORD, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], ChangePassword);
Router.post(ROUTES.AUTH.REFRESH_TOKEN, RefreshToken);
Router.post(ROUTES.AUTH.LOGOUT, Logout);

module.exports = Router;
