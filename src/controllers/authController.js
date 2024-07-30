const asyncHandler = require('express-async-handler');
const UserModel = require('../models/userModel');
const { generalJwtAccessToken, generalJwtRefreshToken, refreshTokenService } = require('../utils/jwt');
const { genOTP, handleSendMail } = require('../utils');
const bcrypt = require('bcrypt');
const { redisClient } = require('../configs/redis');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// [POST] /api/v1/auth/login
const Login = asyncHandler(async (req, res) => {
    if (!req.body.username || !req.body.password) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Username and password are required');
    }

    const user = await UserModel.findOne({ username: req.body.username }).populate('role', 'name');

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    } else {
        const matchPassword = await bcrypt.compare(req.body.password, user.password);
        if (matchPassword) {
            const accessToken = generalJwtAccessToken({
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role.name,
            });

            const refreshToken = await generalJwtRefreshToken({
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role.name,
            });

            if (!refreshToken || !accessToken) {
                throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Generate token failed');
            }

            res.status(200).json({
                message: 'Đăng nhập thành công',
                data: {
                    id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role.name,
                    accessToken,
                    refreshToken,
                },
            });
        } else {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
        }
    }
});

// [POST] /api/v1/auth/refresh-token
const RefreshToken = asyncHandler(async (req, res) => {
    console.log('req.headers.token', req.headers.token);
    const refreshToken = req.headers.token.split(' ')[1];
    console.log('refreshToken', refreshToken);
    if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is missing');
    }

    const newAccessToken = await refreshTokenService(refreshToken);
    if (!newAccessToken) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Generate token failed');
    }
    res.json({
        message: 'Refresh token successfully',
        data: {
            accessToken: newAccessToken,
        },
    });
});

// [POST] /api/v1/auth/register
const Register = asyncHandler(async (req, res) => {
    const hashPassword = await bcrypt.hash(req.body.password, 10);
    const user = new UserModel({
        username: req.body.username,
        fullName: req.body.fullName,
        email: req.body.email,
        password: hashPassword,
        avatar: req.body.avatar,
    });
    await user.save();
    res.status(201).json({
        message: 'Đăng ký thành công',
        data: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
        },
    });
});

// [POST] /api/v1/auth/send-reset-password-email
const SendResetPasswordEmail = asyncHandler(async (req, res) => {
    if (!req.body.email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản');
    }

    const otp = genOTP();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: req.body.email,
        subject: 'Reset password',
        text: `Mã OTP của bạn là: ${otp}`,
    };

    const result = await handleSendMail(mailOptions);

    if (result === 'OK') {
        res.status(200).json({
            message: 'Đã gửi mã OTP',
            data: {
                email: req.body.email,
                otp,
                expiredIn: Date.now() + 30000,
            },
        });
    } else {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'failed to send email');
    }
});

// [POST] /api/v1/auth/reset-password
const ResetPassword = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email and new password are required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    const hashPassword = await bcrypt.hash(req.body.newPassword, 10);

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    await findUser.updateOne({
        password: hashPassword,
    });

    res.status(200).json({
        data: {
            message: 'Đổi mật khẩu thành công',
            email: req.body.email,
        },
    });
});

// [POST] /api/v1/auth/change-password
const ChangePassword = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.oldPassword || !req.body.newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email, old password and new password are required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    const matchPassword = await bcrypt.compare(req.body.oldPassword, findUser.password);

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (!matchPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Old password is incorrect');
    }

    if (matchPassword && req.body.oldPassword === req.body.newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'New password must be different from old password');
    }

    const hashPassword = await bcrypt.hash(req.body.newPassword, 10);

    await findUser.updateOne({
        password: hashPassword,
    });

    res.status(200).json({
        message: 'Đổi mật khẩu thành công',
        data: {
            email: req.body.email,
        },
    });
});

// [POST] /api/v1/auth/logout
const Logout = asyncHandler(async (req, res) => {
    const refreshToken = req.headers.token.split(' ')[1];

    if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is missing');
    }

    let decoded;

    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid token');
    }

    await redisClient.del(decoded.id.toString());

    res.status(200).json({
        message: 'Đăng xuất thành công',
    });
});

module.exports = {
    Login,
    Register,
    SendResetPasswordEmail,
    ResetPassword,
    ChangePassword,
    RefreshToken,
    Logout,
};
