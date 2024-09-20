require('dotenv').config();
const jwt = require('jsonwebtoken');
const { redisClient } = require('../configs/redis');
const ApiError = require('./ApiError');
const { StatusCodes } = require('http-status-codes');
const { use } = require('../routes/authRouter');

const generalJwtAccessToken = (data) => {
    return jwt.sign(data, process.env.JWT_ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_TIME,
    });
};

const generalJwtRefreshToken = async (data) => {
    try {
        const refreshToken = jwt.sign(data, process.env.JWT_REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_TIME,
        });

        await redisClient.set(data.id.toString(), refreshToken, {
            EX: process.env.REDIS_EXPIRES_TIME,
        });

        return refreshToken;
    } catch (err) {
        return null;
    }
};

const refreshTokenService = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET);

        const refreshToken = await redisClient.get(decoded.id.toString());

        if (decoded && token === refreshToken) {
            const newAccessToken = generalJwtAccessToken({
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                typeRole: decoded.typeRole,
                roleCode: decoded.roleCode,
            });
            return newAccessToken;
        }

        return null;
    } catch (error) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }
};

module.exports = {
    generalJwtAccessToken,
    generalJwtRefreshToken,
    refreshTokenService,
};
