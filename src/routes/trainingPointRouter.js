const express = require('express');
const Router = express.Router();
const checkAuth = require('../middlewares/checkAuthMiddleware');
const checkRole = require('../middlewares/checkRoleMiddleware');
const ROLES = require('../constants/roles');
const ROUTES = require('../constants/routes');
const {
    CreateTrainingPoint,
    GetAllTrainingPoint,
    UpdateStatusTrainingPoint,
    UpdateCriteriaScoreTrainingPoint,
    UpdateCriteriaEvidenceTrainingPoint,
    GetTrainingPointById,
    UpdateMultipleCriteriaScoreTrainingPoint,
    GetCriteriaEvidence,
} = require('../controllers/trainingPointController');
const upload = require('../configs/multer');

Router.get(ROUTES.TRAINING_POINT.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetAllTrainingPoint);
Router.get(ROUTES.TRAINING_POINT.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetTrainingPointById);
Router.get(
    ROUTES.TRAINING_POINT.GET_CRITERIA_EVIDENCE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    GetCriteriaEvidence
);
Router.post(ROUTES.TRAINING_POINT.CREATE, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], CreateTrainingPoint);
Router.put(
    ROUTES.TRAINING_POINT.UPDATE_STATUS,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    UpdateStatusTrainingPoint
);
Router.put(
    ROUTES.TRAINING_POINT.UPDATE_CRITERIA_SCORE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    UpdateCriteriaScoreTrainingPoint
);
Router.put(
    ROUTES.TRAINING_POINT.UPDATE_MULTIPLE_CRITERIA_SCORE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.array('evidence', 10),
    UpdateMultipleCriteriaScoreTrainingPoint
);
Router.put(
    ROUTES.TRAINING_POINT.UPDATE_CRITERIA_EVIDENCE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.array('evidence', 10),
    UpdateCriteriaEvidenceTrainingPoint
);

module.exports = Router;
