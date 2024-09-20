const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const checkRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authenticated');
        }
        if (!role.includes(req.user.typeRole)) {
            throw new ApiError(StatusCodes.FORBIDDEN, 'You are not allowed to access this route');
        }
        next();
    };
};

module.exports = checkRole;
