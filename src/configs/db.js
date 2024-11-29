const mongoose = require('mongoose');
const { initializeSemesterYears, initializedRoles } = require('./initialize');

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
        const DB_URI =
            process.env.NODE_ENV === 'development' ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI_PRODUCTION;
        const connect = await mongoose.connect(DB_URI);
        await initializeSemesterYears();
        await initializedRoles();
        console.log(`Connect to database successfully`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
