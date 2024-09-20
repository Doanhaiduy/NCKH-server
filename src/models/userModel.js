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
            maxLength: [100, 'Your name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please enter your email'],
            unique: true,
            trim: true,
            lowercase: true,
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
            select: false,
        },
        sclassName: {
            type: mongoose.Schema.ObjectId,
            ref: 'Class',
            required: [true, 'Please enter your class'],
        },
        avatar: {
            type: String,
            default: 'https://cdn.icon-icons.com/icons2/1378/PNG/512/avatardefault_92824.png',
        },
        role: {
            type: mongoose.Schema.ObjectId,
            ref: 'Role',
            required: [true, 'Please enter your role'],
        },
    },
    { timestamps: true, versionKey: false }
);

userSchema.index({ username: 1 }, { unique: true });

userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const UserSchema = mongoose.model('User', userSchema);
module.exports = UserSchema;
