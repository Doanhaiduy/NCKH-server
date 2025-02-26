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
    UpdateCriteriaEvidence,
    GetTrainingPointById,
    UpdateCriteriaScore,
    GetCriteriaEvidence,
    UpdateCriteriaScoreTemp,
    UpdateCriteriaEvidenceStatus,
    GetAllResponse,
    GetAllResponseByTrainingPoint,
    GetOverviewTrainingPointList,
    GetTrainingPointByClass,
} = require('../controllers/trainingPointController');
const upload = require('../configs/multer');

Router.get(ROUTES.TRAINING_POINT.GET_ALL, [checkAuth, checkRole([ROLES.ADMIN])], GetAllTrainingPoint);
Router.get(ROUTES.TRAINING_POINT.GET_OVERVIEW, [checkAuth, checkRole([ROLES.ADMIN])], GetOverviewTrainingPointList);
Router.get(ROUTES.TRAINING_POINT.GET_BY_CLASS, [checkAuth, checkRole([ROLES.ADMIN])], GetTrainingPointByClass);
Router.get(ROUTES.TRAINING_POINT.GET_ALL_RESPONSE, [checkAuth, checkRole([ROLES.ADMIN])], GetAllResponse);
Router.get(
    ROUTES.TRAINING_POINT.GET_ALL_RESPONSE_BY_TRAINING_POINT,
    [checkAuth, checkRole([ROLES.ADMIN])],
    GetAllResponseByTrainingPoint,
);
Router.get(ROUTES.TRAINING_POINT.ID, [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])], GetTrainingPointById);
Router.get(
    ROUTES.TRAINING_POINT.GET_CRITERIA_EVIDENCE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    GetCriteriaEvidence,
);

Router.post(ROUTES.TRAINING_POINT.CREATE, [checkAuth, checkRole([ROLES.ADMIN])], CreateTrainingPoint);
Router.put(ROUTES.TRAINING_POINT.UPDATE_STATUS, [checkAuth, checkRole([ROLES.ADMIN])], UpdateStatusTrainingPoint);

Router.put(ROUTES.TRAINING_POINT.UPDATE_CRITERIA_SCORE, [checkAuth, checkRole([ROLES.ADMIN])], UpdateCriteriaScore);

Router.put(
    ROUTES.TRAINING_POINT.UPDATE_CRITERIA_SCORE_TEMPLATE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    UpdateCriteriaScoreTemp,
);

Router.put(
    ROUTES.TRAINING_POINT.UPDATE_CRITERIA_EVIDENCE,
    [checkAuth, checkRole([ROLES.ADMIN, ROLES.USER])],
    upload.array('evidence', 10),
    UpdateCriteriaEvidence,
);

Router.put(
    ROUTES.TRAINING_POINT.UPDATE_CRITERIA_EVIDENCE_STATUS,
    [checkAuth, checkRole([ROLES.ADMIN])],
    UpdateCriteriaEvidenceStatus,
);

module.exports = Router;
