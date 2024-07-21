const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.ObjectId,
            ref: 'Event',
            required: [true, 'Please enter your event'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Please enter your user'],
        },
        checkInAt: {
            type: Date,
            required: [true, 'Please enter your check in time'],
        },

        status: {
            validate: {
                // this function will be called when the document is saved
            },
            enum: ['pending', 'active', 'inactive'],
            default: 'active',
        },

        location: {
            lat: {
                type: Number,
                required: [true, 'Please enter your latitude'],
            },
            lng: {
                type: Number,
                required: [true, 'Please enter your longitude'],
            },
            name: {
                type: String,
                required: [true, 'Please enter your location name'],
                trim: true,
                maxLength: [50, 'Your location name cannot exceed 50 characters'],
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

attendanceSchema.index({ event: 1, user: 1 }, { unique: true });

attendanceSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

attendanceSchema.set('toJSON', {
    virtuals: true,
});

const AttendanceSchema = mongoose.model('Attendance', attendanceSchema);

module.exports = AttendanceSchema;
