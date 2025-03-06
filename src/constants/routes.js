const ROUTES = Object.freeze({
    AUTH: {
        ROOT: '/auth',
        LOGIN: '/login',
        LOGIN_ADMIN: '/admin/login',
        REGISTER: '/register',
        FORGOT_PASSWORD: '/forgot-password',
        VERIFY_OTP: '/verify-otp',
        RESET_PASSWORD: '/reset-password',
        CHANGE_PASSWORD: '/change-password',
        REFRESH_TOKEN: '/refresh-token',
        LOGOUT: '/logout',
    },

    SCLASS: {
        ROOT: '/class',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
        GET_ALL_STUDENTS: '/:id/students',
        GET_ALL_ADMINISTRATORS: '/:id/administrators',
        GET_ALL_TRAINING_POINTS: '/:id/training-points',
    },

    ROLE: {
        ROOT: '/roles',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
    },

    PERMISSION: {
        ROOT: '/permissions',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
    },

    USER: {
        ROOT: '/users',
        ID: '/:id',
        GET_ATTENDANCE: '/:id/attendances',
        GET_TRAINING_POINTS: '/:id/training-points',
        GET_ALL: '/get-all',
        ID: '/:id',
        UPLOAD: '/upload',
        UPLOAD_MULTIPLE: '/upload-multiple',
        GET_NOTIFICATIONS: '/:id/notifications',
        GET_BY_CLASS_ID: '/class/:classId',
    },

    POST: {
        ROOT: '/posts',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
    },

    EVENT: {
        ROOT: '/events',
        GET_ALL: '/get-all',
        GET_ATTENDEES: '/:id/attendees',
        ID: '/:id',
        CREATE: '/',
        CHECK_IN: '/:id/check-in',
        GET_ALL_BY_USER: '/:userId/get-all',
        GET_REGISTERED_ATTENDEES: '/:id/registered-attendees',
        REGISTER_EVENT: '/:id/register',
        UNREGISTER_EVENT: '/:id/unregister',
        GET_PAST_EVENT: '/past-events',
        GET_TODAY_EVENTS: '/today-events',
    },

    ATTENDANCE: {
        ROOT: '/attendances',
        ID: '/:id',
        CREATE: '/',
    },

    TRAINING_POINT: {
        ROOT: '/training-points',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE_STATUS: '/:id/update-status',
        UPDATE_CRITERIA_SCORE: '/:criteriaId/update-criteria-score',
        UPDATE_CRITERIA_SCORE_TEMPLATE: '/:criteriaId/update-criteria-score-template',
        UPDATE_CRITERIA_EVIDENCE: '/:criteriaId/update-criteria-evidence',
        UPDATE_CRITERIA_EVIDENCE: '/:criteriaId/update-criteria-evidence',
        GET_CRITERIA_EVIDENCE: '/:criteriaId/criteria-evidence',
        UPDATE_CRITERIA_EVIDENCE_STATUS: '/:evidenceId/update-criteria-evidence-status',
        GET_OVERVIEW: '/overview',
        GET_ALL_RESPONSE: '/response/get-all',
        GET_ALL_RESPONSE_BY_TRAINING_POINT: '/response/:trainingPointId/get-all',
        GET_BY_CLASS: '/get-by-class/:classId',
    },

    NOTIFICATION: {
        ROOT: '/notifications',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
        DELETE: '/:id',
        READ: '/:id/read/:userId',
    },

    FEEDBACK: {
        ROOT: '/feedbacks',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        DELETE: '/:id',
    },

    STATISTICS: {
        ROOT: '/statistics',
        GET_REGISTERED_EVENTS: '/registered-events',
        GET_ATTENDEES_EVENTS: '/attendees-events',
        GET_OVERVIEW_DASHBOARD: '/overview-dashboard',
        GET_TOP_STUDENTS: '/top-students',
    },

    EXPORT: {
        ROOT: '/export',
        EXPORT_EVENT_DATA: '/event-data/:id',
        EXPORT_EVENT_LIST: '/event-list',
        EXPORT_USER_LIST: '/user-list',
        EXPORT_POST_LIST: '/post-list',
        EXPORT_FEEDBACK_LIST: '/feedback-list',
        EXPORT_TRAINING_POINT_LIST: '/training-point-list',
        EXPORT_TRAINING_POINT_LIST_BY_CLASS: '/training-point-list-by-class/:classId', // add classname in excel tdetails
        EXPORT_TRAINING_POINT_LIST_BY_USER: '/training-point-list-by-user/:userId',
        EXPORT_TRAINING_POINT_BY_ID: '/training-point/:id',
    },

    UTILS: {
        ROOT: '/utils',
        SET_NEW_ROLE: '/set-new-role',
        GET_SEMESTER_YEARS: '/semester-years',
        GET_SEMESTER_YEAR: '/semester-years/:id',
        CREATE_SEMESTER_YEAR: '/semester-years',
        UPDATE_SEMESTER_YEAR: '/semester-years/:id',
        GRADING_PERIOD: '/grading-periods',
        UPDATE_GRADING_PERIOD: '/grading-periods/:id',
    },

    VIEWS: {
        POST_DETAILS: '/posts/:id',
    },
});

module.exports = ROUTES;
