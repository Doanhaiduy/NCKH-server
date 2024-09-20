const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
    {
        permissionCode: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
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

permissionSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const PermissionSchema = mongoose.model('Permission', permissionSchema);

module.exports = PermissionSchema;
