const express = require('express');
const Router = express.Router();
const { GetUsers, UploadSingle, UploadMultiple } = require('../controllers/userController');
const upload = require('../configs/multer');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const Roles = require('../constants/roles');

Router.get('/get-all', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], GetUsers);
Router.post('/upload', [checkAuth, checkRole([Roles.ADMIN, Roles.USER])], upload.single('image'), UploadSingle);
Router.post(
    '/upload-multiple',
    [checkAuth, checkRole([Roles.ADMIN, Roles.USER])],
    upload.array('images', 10),
    UploadMultiple
);

module.exports = Router;
