require('dotenv').config();
const jwt = require('jsonwebtoken');

const getJwtToken = (id, username, email, role) => {
    return jwt.sign({ id, username, email, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME,
    });
};

module.exports = {
    getJwtToken,
};
