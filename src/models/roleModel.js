const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        permissions: {
            type: [String],
            // required: true,
        },
        description: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

roleSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

roleSchema.set('toJSON', {
    virtuals: true,
});

const RoleSchema = mongoose.model('Role', roleSchema);

module.exports = RoleSchema;
