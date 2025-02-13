const express = require('express');

const Router = express.Router();
const ROUTES = require('../constants/routes');
const { ViewPostById } = require('../controllers/viewController');

require('dotenv').config();

Router.get(ROUTES.VIEWS.POST_DETAILS, ViewPostById);
Router.get('/createUser', (req, res) => {
    res.render('createUser', {
        accessToken: process.env.ACCESS_TOKEN_ADMIN,
    });
});
Router.get('/createUsers', (req, res) => {
    res.render('createUsers', {
        accessToken: process.env.ACCESS_TOKEN_ADMIN,
    });
});

module.exports = Router;
