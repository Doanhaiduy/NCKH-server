const asyncHandler = require('express-async-handler');
const UserModel = require('../models/userModel');
const sClassSchema = require('../models/sclassModel');
const RoleSchema = require('../models/roleModel');
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

    const user = await UserModel.findOne({ username: req.body.username }).select('+password').populate('role');

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    } else {
        const matchPassword = await bcrypt.compare(req.body.password, user.password);

        if (matchPassword) {
            const accessToken = generalJwtAccessToken({
                id: user._id,
                username: user.username,
                email: user.email,
                typeRole: user.role.typeRole,
                roleCode: user.role.roleCode,
            });

            const refreshToken = await generalJwtRefreshToken({
                id: user._id,
                username: user.username,
                email: user.email,
                typeRole: user.role.typeRole,
                roleCode: user.role.roleCode,
            });

            if (!refreshToken || !accessToken) {
                throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Generate token failed');
            }

            const sclass = await sClassSchema.findById(user.sclassName);
            if (!sclass) {
                throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
            }

            user.expoPushToken = req.body.expoPushToken || user.expoPushToken;
            await user.save();

            res.status(200).json({
                status: 'success',
                data: {
                    _id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role.name,
                    accessToken,
                    refreshToken,
                    sclassName: sclass.sclassName,
                    signInAt: new Date(),
                },
            });
        } else {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
        }
    }
});

// [POST] /api/v1/admin/auth/login
const AdminLogin = asyncHandler(async (req, res) => {
    if (!req.body.username || !req.body.password) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Username and password are required');
    }

    const user = await UserModel.findOne({ username: req.body.username }).select('+password').populate('role').lean();

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }
    if (user.role.typeRole !== 'admin') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
    }

    const matchPassword = await bcrypt.compare(req.body.password, user.password);

    if (matchPassword) {
        const accessToken = generalJwtAccessToken({
            id: user._id,
            username: user.username,
            email: user.email,
            typeRole: user.role.typeRole,
            roleCode: user.role.roleCode,
        });

        const refreshToken = await generalJwtRefreshToken({
            id: user._id,
            username: user.username,
            email: user.email,
            typeRole: user.role.typeRole,
            roleCode: user.role.roleCode,
        });

        if (!refreshToken || !accessToken) {
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Generate token failed');
        }

        const sclass = await sClassSchema.findById(user.sclassName);
        if (!sclass) {
            throw new ApiError(StatusCodes.NOT_FOUND, 'Class not found');
        }

        res.status(200).json({
            status: 'success',
            data: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar,
                role: user.role.name,
                accessToken,
                refreshToken,
                sclassName: sclass.sclassName,
                signInAt: new Date(),
            },
        });
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
    }
});

// [POST] /api/v1/auth/refresh-token
const RefreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.headers.token.split(' ')[1];
    console.log(refreshToken);
    if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is missing');
    }

    const data = await refreshTokenService(refreshToken);

    if ((!data?.newAccessToken, !data?.newRefreshToken)) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Generate token failed');
    }

    res.json({
        message: 'Refresh token successfully',
        data: {
            accessToken: data.newAccessToken,
            refreshToken: data.newRefreshToken,
        },
    });
});

// [POST] /api/v1/auth/register
const Register = asyncHandler(async (req, res) => {
    const hashPassword = await bcrypt.hash(req.body.password, 10);
    if (!req.body.sclassName) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Class name is required');
    }
    if (!req.body.role) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role is required');
    }

    let hasClass = await sClassSchema.findOne({
        sclassName: req.body.sclassName,
    });

    if (!hasClass) {
        hasClass = new sClassSchema({
            sclassName: req.body.sclassName,
        });
        await hasClass.save();
    }
    const hasRole = await RoleSchema.findOne({
        roleCode: req.body.role,
    });
    if (!hasRole) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role not found');
    }

    const user = new UserModel({
        username: req.body.username,
        fullName: req.body.fullName,
        email: req.body.email,
        password: hashPassword,
        avatar: req.body.avatar,
        role: hasRole._id,
        sclassName: hasClass._id,
    });
    await user.save();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: req.body.email,
        subject: `Thông báo: Tài khoản của bạn đã được tạo thành công`,
        text: `Xin chào ${req.body.fullName},
    
    Chúc mừng bạn đã đăng ký thành công tài khoản trên hệ thống NTU-Student. Dưới đây là thông tin tài khoản của bạn:
    
    - **Tên đăng nhập**: ${req.body.username}
    - **Mật khẩu**: ${req.body.password}
    
    Vui lòng đăng nhập vào hệ thống và thay đổi mật khẩu ngay sau khi đăng nhập để đảm bảo an toàn cho tài khoản của bạn.
    
    📱 **Tải ứng dụng NTU-Student tại**:  
    [Google Play Store](https://play.google.com/store/apps/details?id=com.doanhaiduy.mobile)
    
    Nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi qua email này.
    
    Trân trọng,  
    NTU-Student Team
        `,
    };

    await handleSendMail(mailOptions);

    res.status(201).json({
        status: 'success',
        data: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar,
            role: hasRole.name,
            sclassName: hasClass.sclassName,
        },
    });
});

// [POST] /api/v1/auth/forgot-password
const ForgotPassword = asyncHandler(async (req, res) => {
    if (!req.body.email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản');
    }

    const otp = genOTP();
    const otpExpire = Date.now() + 60000;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: req.body.email,
        subject: `Xác nhận đổi mật khẩu cho tài khoản ${req.body.email}`,
        text: `Xin chào ${findUser.fullName},
    
    Bạn vừa yêu cầu đổi mật khẩu cho tài khoản NTU-Student.  
    Vui lòng sử dụng mã OTP dưới đây để xác nhận:
    
    🔑 **Mã OTP của bạn**: ${otp}
    
    Lưu ý: Mã OTP này có hiệu lực trong vòng **1 phút**.  
    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi để được hỗ trợ.
    
    Trân trọng,  
    **NTU-Student Team**
        `,
    };

    const result = await handleSendMail(mailOptions);

    await findUser.updateOne({
        otp,
        otpExpire,
        isVerifiedOtp: false,
    });

    if (result === 'OK') {
        res.status(200).json({
            status: 'success',
            data: {
                email: req.body.email,
                otp,
                expiredIn: otpExpire,
            },
        });
    } else {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'failed to send email');
    }
});

// [POST] /api/v1/auth/verify-otp
const VerifyOTP = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.otp) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email and OTP are required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (findUser.otp !== req.body.otp) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is incorrect');
    }

    if (findUser.otpExpire < Date.now()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is expired');
    }

    await findUser.updateOne({
        otp: null,
        otpExpire: null,
        isVerifiedOtp: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            email: req.body.email,
        },
    });
});

// [POST] /api/v1/auth/reset-password
const ResetPassword = asyncHandler(async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You must provide email and new password');
    }

    const findUser = await UserModel.findOne({ email: req.body.email });

    if (!findUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    if (findUser.isVerifiedOtp === false) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not verified');
    }

    const hashPassword = await bcrypt.hash(req.body.newPassword, 10);

    await findUser.updateOne({
        password: hashPassword,
        passwordChangedAt: Date.now(),
        isVerifiedOtp: false,
    });

    res.status(200).json({
        status: 'success',
        data: {
            email: req.body.email,
        },
    });
});

// [POST] /api/v1/auth/change-password
const ChangePassword = asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.oldPassword || !req.body.newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email, old password and new password are required');
    }

    const findUser = await UserModel.findOne({ email: req.body.email }).select('+password');

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
        status: 'success',
        data: {
            email: req.body.email,
        },
    });
});

// [POST] /api/v1/auth/logout
const Logout = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is missing');
    }

    let decoded;

    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid token');
    }

    const refreshTokenStorage = await redisClient.get(decoded.id.toString());

    if (refreshToken !== refreshTokenStorage) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
    }

    const user = await UserModel.findById(decoded.id);
    user.expoPushToken = null;
    await user.save();

    await redisClient.del(decoded.id.toString());

    res.status(200).json({
        status: 'success',
        data: 'ok',
    });
});

module.exports = {
    Login,
    Register,
    ForgotPassword,
    VerifyOTP,
    ResetPassword,
    ChangePassword,
    RefreshToken,
    Logout,
    AdminLogin,
};
