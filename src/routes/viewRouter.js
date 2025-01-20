const express = require('express');

const Router = express.Router();
const ROUTES = require('../constants/routes');
const { ViewPostById } = require('../controllers/viewController');

Router.get(ROUTES.VIEWS.POST_DETAILS, ViewPostById);

module.exports = Router;
