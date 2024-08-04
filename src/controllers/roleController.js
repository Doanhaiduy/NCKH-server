const asyncHandle = require('express-async-handler');
const RoleSchema = require('../models/roleModel');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// [POST] /api/v1/utils/set-new-role
const SetNewRole = asyncHandle(async (req, res) => {
    if (!req.body.name || !req.body.description) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Name and description are required');
    }

    const hasRole = await RoleSchema.findOne({ name: req.body.name });
    if (hasRole) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Role has already existed');
    }

    const newRole = new RoleSchema({
        name: req.body.name,
        description: req.body.description,
    });

    await newRole.save();

    res.status(201).json({
        status: 'success',
        data: newRole,
    });
});

module.exports = {
    SetNewRole,
};
