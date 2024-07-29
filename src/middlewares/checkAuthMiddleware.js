const jwt = require('jsonwebtoken');
require('dotenv').config();

const checkAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            res.status(401);
            throw new Error('Token is missing');
        }
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            throw new Error('Token has expired');
        }
        res.status(401);
        throw new Error('You are not authenticated');
    }
};

module.exports = checkAuth;
