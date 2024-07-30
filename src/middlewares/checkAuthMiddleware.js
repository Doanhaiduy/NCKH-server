const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
require('dotenv').config();

const checkAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authenticated');
        }
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token is expired');
        }
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authenticated');
    }
};

module.exports = checkAuth;
