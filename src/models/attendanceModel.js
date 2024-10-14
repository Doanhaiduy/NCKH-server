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
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        distance: {
            type: Number,
            required: [true, 'Please enter your distance'],
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
                trim: true,
                default: 'No name location',
                maxLength: [500, 'Your location name cannot exceed 500 characters'],
            },
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

attendanceSchema.index({ event: 1, user: 1 }, { unique: true });

attendanceSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const AttendanceSchema = mongoose.model('Attendance', attendanceSchema);

module.exports = AttendanceSchema;
