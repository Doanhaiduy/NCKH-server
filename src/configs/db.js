const mongoose = require('mongoose');

const defaultOptions = {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
    },
};

mongoose.Schema.defaultOptions = defaultOptions;

const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGO_URI_LOCAL);
        console.log(`Connect to database successfully`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
