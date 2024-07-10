const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
    {
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
    }
);

permissionSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

permissionSchema.set('toJSON', {
    virtuals: true,
});

const PermissionSchema = mongoose.model('Permission', permissionSchema);

module.exports = PermissionSchema;
