const errorHandlerMiddleware = (err, req, res, next) => {
    const statusCode = err.name === 'Error' ? 400 : err.statusCode || 500;
    if (err.name === 'MongoServerError') {
        let errors = {};
        if (err.code === 11000) {
            console.log('ERROR', err.keyValue);
            if (err.keyValue.event && err.keyValue.user) {
                return res.status(400).json({
                    message: 'You have already checked in!',
                    statusCode: 400,
                });
            }
            errors[Object.keys(err.keyValue)[0]] = `${Object.keys(err.keyValue)[0]} is already taken!`;
        }

        res.status(400).json({
            message: Object.keys(err.keyValue)[0] + ' is already taken!',
            statusCode: 400,
            errors,
        });
        next();
    } else {
        if (err.name === 'ValidationError') {
            let errors = {};

            Object.keys(err.errors).forEach((key) => {
                errors[key] = err.errors[key].message;
            });

            res.status(400).json({
                message: Object.keys(err.errors)[0] + ' is required!',
                statusCode: 400,
                errors,
            });
            next();
        } else {
            res.status(statusCode).json({
                message: err.message,
                statusCode,
                stack: err.stack,
            });
            next();
        }
    }
};

module.exports = errorHandlerMiddleware;
