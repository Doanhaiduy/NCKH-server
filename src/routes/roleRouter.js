const express = require('express');

const Router = express.Router();

const { SetNewRole } = require('../controllers/roleController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const upload = require('../configs/multer');
const { UploadSingle, UploadMultiple } = require('../controllers/userController');

Router.post(ROUTES.UTILS.SET_NEW_ROLE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], SetNewRole);
Router.post(
    ROUTES.UTILS.UPLOAD,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.single('image'),
    UploadSingle
);
Router.post(
    ROUTES.UTILS.UPLOAD_MULTIPLE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.array('images', 10),
    UploadMultiple
);
module.exports = Router;
