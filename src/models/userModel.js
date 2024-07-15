const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Please enter your username'],
            trim: true,
            unique: true,
            maxLength: [20, 'Your username cannot exceed 20 characters'],
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9_]+$/.test(v);
                },
                message: (props) => {
                    return `${props.value} is not a valid username!`;
                },
            },
        },
        fullName: {
            type: String,
            required: [true, 'Please enter your fullName'],
            trim: true,
            maxLength: [30, 'Your name cannot exceed 30 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please enter your email'],
            unique: true,
            trim: true,
            maxLength: [50, 'Your email cannot exceed 50 characters'],
            validate: {
                validator: function (v) {
                    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
                },
                message: (props) => {
                    return `${props.value} is not a valid email!`;
                },
            },
        },
        password: {
            type: String,
            required: [true, 'Please enter your password'],
            minLength: [6, 'Your password must be at least 6 characters'],
            // select: false,
        },
        avatar: {
            type: String,
            default: 'https://res.cloudinary.com/dbnoomvgm/image/upload/v1719851707/NCKH/xw6ovct05dhrahgbebdc.jpg',
        },
        role: {
            type: mongoose.Schema.ObjectId,
            ref: 'Role',
            default: '6694f83a1a2e4d691b74f1b2',
            required: [true, 'Please enter your role'],
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true });

userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

userSchema.set('toJSON', {
    virtuals: true,
});

const UserSchema = mongoose.model('User', userSchema);
module.exports = UserSchema;
