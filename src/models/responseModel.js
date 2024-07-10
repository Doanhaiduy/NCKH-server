const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your response name'],
        trim: true,
        maxLength: [50, 'Your response name cannot exceed 50 characters'],
    },
    dataType: {
        type: String,
        required: [true, 'Please enter your response data type'],
        enum: ['text', 'file'],
    },
    data: {
        type: String,
        required: [true, 'Please enter your response data'],
        trim: true,
        maxLength: [500, 'Your response data cannot exceed 500 characters'],
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
});
