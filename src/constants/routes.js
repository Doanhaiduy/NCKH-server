const ROUTES = Object.freeze({
    AUTH: {
        ROOT: '/auth',
        LOGIN: '/login',
        REGISTER: '/register',
        SEND_RESET_PASSWORD_EMAIL: '/send-reset-password-email',
        RESET_PASSWORD: '/reset-password',
        CHANGE_PASSWORD: '/change-password',
        REFRESH_TOKEN: '/refresh-token',
        LOGOUT: '/logout',
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
        CREATE: '/create',
        UPDATE: '/update/:id',
    },
    EVENT: {
        ROOT: '/events',
        GET_ALL: '/get-all',
        GET_ATTENDEES: '/:id/attendees',
        ID: '/:id',
        CREATE: '/create',
        CHECK_IN: '/:id/check-in',
    },
    ATTENDANCE: {
        ROOT: '/attendances',
        ID: '/:id',
        CREATE: '/create',
    },
    TRAINING_POINT: {
        ROOT: '/training-points',
        GET_ALL: '/get-all',
        ID: '/:id',
        CREATE: '/create',
    },
    UTILS: {
        ROOT: '/utils',
        SET_NEW_ROLE: '/set-new-role',
    },
});

module.exports = ROUTES;
