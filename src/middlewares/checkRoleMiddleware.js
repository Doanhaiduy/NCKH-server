const checkRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('Bạn cần phải đăng nhập');
        }
        if (!role.includes(req.user.role)) {
            res.status(403);
            throw new Error('Bạn không có quyền truy cập');
        }
        next();
    };
};

module.exports = checkRole;
