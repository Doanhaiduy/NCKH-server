const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
    {
        roleCode: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        typeRole: {
            type: String,
            enum: ['manager', 'user'],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        permissions: {
            type: [mongoose.Schema.ObjectId],
            ref: 'Permission',
            default: [],
        },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            virtuals: true,
        },
    }
);

roleSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
