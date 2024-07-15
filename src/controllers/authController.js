const asyncHandler = require('express-async-handler');
const UserModel = require('../models/userModel');
const { getJwtToken } = require('../utils/jwt');
const { genOTP, handleSendMail } = require('../utils');
const bcrypt = require('bcrypt');

const Login = asyncHandler(async (req, res) => {
    if (!req.body.username || !req.body.password) {
        res.status(400);
        throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu');
    }

    const user = await UserModel.findOne({ username: req.body.username }).populate('role');

    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy tài khoản');
    } else {
        const matchPassword = await bcrypt.compare(req.body.password, user.password);
        if (matchPassword) {
            res.status(200).json({
                message: 'Đăng nhập thành công',
                data: {
                    id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    accessToken: getJwtToken(user._id, user.username, user.email, user.role.name),
                },
            });
        } else {
            res.status(403);
            throw new Error('Mật khẩu không chính xác');
        }
    }
});

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
            accessToken: getJwtToken(user._id, user.username, user.email, user.role),
        },
    });
});

const SendResetPasswordEmail = asyncHandler(async (req, res) => {
    if (!req.body.email) {
        res.status(400);
        throw new Error('Vui lòng nhập email');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    if (!findUser) {
        res.status(404);
        throw new Error('Không tìm thấy tài khoản');
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
                expiredIn: Date.now() + 600000,
            },
        });
    } else {
        res.status(500);
        throw new Error('Gửi email thất bại');
    }
});

const ResetPassword = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.newPassword) {
        res.status(400);
        throw new Error('Thông tin không hợp lệ');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    const hashPassword = await bcrypt.hash(req.body.newPassword, 10);

    if (!findUser) {
        res.status(404);
        throw new Error('Không tìm thấy tài khoản');
    }

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

const ChangePassword = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.oldPassword || !req.body.newPassword) {
        res.status(400);
        throw new Error('Thông tin không hợp lệ');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    const matchPassword = await bcrypt.compare(req.body.oldPassword, findUser.password);

    if (!findUser) {
        res.status(404);
        throw new Error('Không tìm thấy tài khoản');
    }

    if (!matchPassword) {
        res.status(403);
        throw new Error('Mật khẩu cũ không chính xác');
    }

    if (matchPassword && req.body.oldPassword === req.body.newPassword) {
        res.status(403);
        throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
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

module.exports = {
    Login,
    Register,
    SendResetPasswordEmail,
    ResetPassword,
    ChangePassword,
};
