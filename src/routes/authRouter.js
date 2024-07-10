const express = require('express');
const Router = express.Router();
const { Login, Register } = require('../controllers/authController');

Router.post('/login', Login);
Router.post('/register', Register);

module.exports = Router;
