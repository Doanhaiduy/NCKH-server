const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const eventSchema = new mongoose.Schema(
    {
        eventCode: {
            type: String,
            required: [true, 'Please enter your event code'],
            trim: true,
            unique: true,
        },
        semesterYear: {
            type: mongoose.Schema.ObjectId,
            ref: 'SemesterYear',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Please enter your event name'],
            trim: true,
            maxLength: [50, 'Your event name cannot exceed 50 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please enter your event description'],
            trim: true,
            maxLength: [500, 'Your event description cannot exceed 500 characters'],
        },
        startAt: {
            type: Date,
            required: [true, 'Please enter your event start date'],
        },
        endAt: {
            type: Date,
            required: [true, 'Please enter your event end date'],
        },
        maxAttendees: {
            type: Number,
            required: [true, 'Please enter your event max attendees'],
        },
        thumbnail: {
            type: String,
            default:
                'https://img.freepik.com/free-vector/abstract-coming-soon-halftone-style-background-design_1017-27282.jpg?semt=ais_hybrid',
        },
        location: {
            lat: {
                type: Number,
                required: [true, 'Please enter your event location latitude'],
            },
            lng: {
                type: Number,
                required: [true, 'Please enter your event location longitude'],
            },
            name: {
                type: String,
                required: [true, 'Please enter your event location name'],
                trim: true,
                maxLength: [50, 'Your event location name cannot exceed 50 characters'],
            },
        },

        distanceLimit: {
            type: Number,
            required: [true, 'Please enter your event distance limit'],
            default: 0,
        },
        qrCodeUrl: {
            type: String,
            required: [true, 'Please enter your event qr code url'],
        },
        author: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'deleted'],
            default: 'active',
        },
        typeEvent: {
            type: String,
            enum: ['mandatory', 'optional'],
            default: 'mandatory',
        },
        post: {
            type: mongoose.Schema.ObjectId,
            ref: 'Post',
            validate: {
                validator: function (value) {
                    if (this.typeEvent === 'optional' && !value) {
                        throw new ApiError(400, 'Please enter your event post id with type optional');
                    }
                    return true;
                },
            },
            default: null,
        },
        criteriaCode: {
            type: String,
            validate: {
                validator: function (value) {
                    if (this.typeEvent === 'optional' && !value) {
                        throw new ApiError(400, 'Please enter your event criteria with type optional');
                    }
                    return true;
                },
            },
            default: null,
        },
        // add validate for this...
        registeredAttendees: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
            },
        ],
        attendeesList: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'Attendance',
            },
        ],
        iv: {
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

eventSchema.index({ eventCode: 1 }, { unique: true });

eventSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

const EventSchema = mongoose.model('Event', eventSchema);
module.exports = EventSchema;
