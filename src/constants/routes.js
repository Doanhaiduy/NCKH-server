const ROUTES = Object.freeze({
    AUTH: {
        ROOT: '/auth',
        LOGIN: '/login',
        REGISTER: '/register',
        SEND_RESET_PASSWORD_EMAIL: '/send-reset-password-email',
        RESET_PASSWORD: '/reset-password',
        CHANGE_PASSWORD: '/change-password',
    },
    USER: {
        ROOT: '/users',
        GET_ALL: '/get-all',
    },
    POST: {
        ROOT: '/posts',
        GET_ALL: '/get-all',
        GET_BY_ID: '/:id',
        CREATE: '/create',
    },
    UTILS: {
        ROOT: '/utils',
        SET_NEW_ROLE: '/set-new-role',
        UPLOAD: '/upload',
        UPLOAD_MULTIPLE: '/upload-multiple',
    },
});

module.exports = ROUTES;
