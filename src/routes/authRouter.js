const express = require('express');
const Router = express.Router();
const {
    Login,
    Register,
    SendResetPasswordEmail,
    ResetPassword,
    ChangePassword,
} = require('../controllers/authController');

Router.post('/login', Login);
Router.post('/register', Register);
Router.post('/send-reset-password-email', SendResetPasswordEmail);
Router.post('/reset-password', ResetPassword);
Router.post('/change-password', ChangePassword);

module.exports = Router;
