const RoleModel = require('../models/roleModel');
const UserModel = require('../models/userModel');

const getAllUserIds = async (typeRole = 'user') => {
    const userRole = await RoleModel.find({
        typeRole: typeRole,
    }).lean();

    if (!userRole) {
        return [];
    }
    const users = await UserModel.find({
        role: {
            $in: userRole.map((role) => role._id),
        },
    }).lean();

    return users.map((user) => user._id.toString());
};

module.exports = {
    getAllUserIds,
};
