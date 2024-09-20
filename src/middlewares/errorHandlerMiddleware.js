const { StatusCodes } = require('http-status-codes');

const errorHandlerMiddleware = (err, req, res, next) => {
    let errors = {};
    if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    if (err.name === 'MongoServerError' && err.code === 11000) {
        err.statusCode = StatusCodes.BAD_REQUEST;
        err.message = Object.keys(err.keyValue)[0] + ' is already taken!';
        errors = { [Object.keys(err.keyValue)[0]]: err.message };
    }

    if (err.name === 'ValidationError') {
        err.statusCode = StatusCodes.BAD_REQUEST;
        Object.keys(err.errors).forEach((key) => {
            errors[key] = err.errors[key].message;
        });
        err.message = `${Object.keys(err.errors)[0]} is required!`;
    }

    const responseError = {
        message: err.message || StatusCodes[err.statusCode],
        statusCode: err.statusCode,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    };

    if (Object.keys(errors).length > 0) responseError.errors = errors;

    res.status(err.statusCode).json(responseError);
};

module.exports = errorHandlerMiddleware;
