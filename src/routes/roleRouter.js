const express = require('express');

const Router = express.Router();

const { GetAllRoles, GetRoleById, CreateRole, UpdateRole, DeleteRole } = require('../controllers/roleController');
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');

// User Role

Router.get(ROUTES.ROLE.GET_ALL, checkAuth, checkRole([ROLES.ADMIN]), GetAllRoles);
Router.get(ROUTES.ROLE.ID, checkAuth, checkRole([ROLES.ADMIN]), GetRoleById);
Router.post(ROUTES.ROLE.CREATE, checkAuth, checkRole([ROLES.ADMIN]), CreateRole);
Router.put(ROUTES.ROLE.UPDATE, checkAuth, checkRole([ROLES.ADMIN]), UpdateRole);
Router.delete(ROUTES.ROLE.ID, checkAuth, checkRole([ROLES.ADMIN]), DeleteRole);

module.exports = Router;
