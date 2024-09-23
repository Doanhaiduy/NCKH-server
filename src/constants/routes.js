const ROUTES = Object.freeze({
    AUTH: {
        ROOT: '/auth',
        LOGIN: '/login',
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

    MANAGER: {
        ROOT: '/managers',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/',
        UPDATE: '/:id',
        GET_ALL_STUDENTS: '/:id/students',
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
        UPDATE_MULTIPLE_CRITERIA_SCORE: '/:criteriaId/update-multiple-criteria-score',
        UPDATE_CRITERIA_EVIDENCE: '/:criteriaId/update-criteria-evidence',
        UPDATE_MULTIPLE_CRITERIA_EVIDENCE: '/:criteriaId/update-multiple-criteria-evidence',
        GET_CRITERIA_EVIDENCE: '/:criteriaId/criteria-evidence',
    },

    UTILS: {
        ROOT: '/utils',
        SET_NEW_ROLE: '/set-new-role',
    },
});

module.exports = ROUTES;
