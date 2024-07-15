const express = require('express');
const Router = express.Router();
const {
    Login,
    Register,
    SendResetPasswordEmail,
    ResetPassword,
    ChangePassword,
} = require('../controllers/authController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const Roles = require('../constants/roles');

Router.post('/login', Login);
Router.post('/register', Register);
Router.post('/send-reset-password-email', SendResetPasswordEmail);
Router.post('/reset-password', ResetPassword);
Router.post('/change-password', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], ChangePassword);

module.exports = Router;
