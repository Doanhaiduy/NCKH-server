const asyncHandle = require('express-async-handler');
const RoleSchema = require('../models/roleModel');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// -----------------  ROLE -----------------
// [GET] /api/v1/-roles/get-all
const GetAllRoles = asyncHandle(async (req, res) => {
    const roles = await RoleSchema.find().lean();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: roles,
    });
});

// [GET] /api/v1/-roles/:id
const GetRoleById = asyncHandle(async (req, res) => {
    const roleId = req.params.id;
    const role = await RoleSchema.findById(roleId).lean();

    if (!role) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Role not found');
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: role,
    });
});

// [POST] /api/v1/-roles/create
const CreateRole = asyncHandle(async (req, res) => {
    if (!req.body.name) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Name is required');
    }

    const hasRole = await RoleSchema.findOne({ name: req.body.name }).lean();
    if (hasRole) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role has already existed');
    }

    if (!req.body.roleCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role code is required');
    }

    const hasRoleCode = await RoleSchema.findOne({ roleCode: req.body.roleCode }).lean();
    if (hasRoleCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role code has already existed');
    }

    const newRole = new RoleSchema({
        name: req.body.name,
        description: req.body.description,
        roleCode: req.body.roleCode,
        typeRole: req.body.typeRole,
    });

    await newRole.save();

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: newRole,
    });
});

// [PUT] /api/v1/-roles/update/:id
const UpdateRole = asyncHandle(async (req, res) => {
    const roleId = req.params.id;
    const role = await RoleSchema.findById(roleId);

    if (!role) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Role not found');
    }

    if (req.body.name) {
        role.name = req.body.name;
    }

    if (req.body.description) {
        role.description = req.body.description;
    }

    await role.save();

    res.status(StatusCodes.OK).json({
        status: 'success',
        data: role,
    });
});

// [DELETE] /api/v1/-roles/:id
const DeleteRole = asyncHandle(async (req, res) => {
    const roleId = req.params.id;
    const role = await RoleSchema.findById(roleId);

    if (!role) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Role not found');
    }

    await role.deleteOne();

    res.status(StatusCodes.NO_CONTENT).json({
        status: 'success',
        data: 'Role deleted successfully',
    });
});

module.exports = {
    GetAllRoles,
    GetRoleById,
    CreateRole,
    UpdateRole,
    DeleteRole,
};
