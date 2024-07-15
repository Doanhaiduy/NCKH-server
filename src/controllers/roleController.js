const asyncHandle = require('express-async-handler');
const RoleSchema = require('../models/roleModel');

const SetNewRole = asyncHandle(async (req, res) => {
    if (!req.body.name || !req.body.description) {
        res.status(400);
        throw new Error('Vui lòng nhập đủ thông tin');
    }

    const hasRole = await RoleSchema.findOne({ name: req.body.name });
    if (hasRole) {
        res.status(400);
        throw new Error('Role đã tồn tại');
    }

    const newRole = new RoleSchema({
        name: req.body.name,
        description: req.body.description,
    });

    await newRole.save();

    res.status(201).json({ data: newRole });
});

module.exports = {
    SetNewRole,
};
