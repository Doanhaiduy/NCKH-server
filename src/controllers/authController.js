const asyncHandler = require('express-async-handler');
const UserModel = require('../models/userModel');

const Login = asyncHandler(async (req, res) => {
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) {
        res.status(400);
        throw new Error('Không tìm thấy tài khoản');
    } else {
        if (user.password === req.body.password) {
            res.status(200).json({
                message: 'Đăng nhập thành công',
                data: user,
            });
        } else {
            res.status(400);
            throw new Error('Mật khẩu không chính xác');
        }
    }
});

const Register = asyncHandler(async (req, res) => {
    const user = new UserModel({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        avatar: req.body.avatar,
    });
    await user.save();
    res.status(201).json({
        message: 'Đăng ký thành công',
        data: user,
    });
});

module.exports = {
    Login,
    Register,
};
