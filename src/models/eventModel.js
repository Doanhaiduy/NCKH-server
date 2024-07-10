const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        eventCode: {
            type: String,
            required: [true, 'Please enter your event code'],
            trim: true,
            unique: true,
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
            validate: {
                // this function will be called when the document is saved
            },
            enum: ['pending', 'active', 'inactive'],
        },
        attendeesList: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
    }
);

eventSchema.index({ eventCode: 1 }, { unique: true });

eventSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

eventSchema.set('toJSON', {
    virtuals: true,
});

const EventSchema = mongoose.model('Event', eventSchema);
module.exports = EventSchema;
