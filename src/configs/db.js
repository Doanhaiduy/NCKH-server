const mongoose = require('mongoose');
const { initializeSemesterYears, initializedRoles } = require('./initialize');
const slug = require('mongoose-slug-generator');

const defaultOptions = {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
    },
};

mongoose.Schema.defaultOptions = defaultOptions;
mongoose.plugin(slug);

const connectDB = async () => {
    try {
        const DB_URI =
            process.env.NODE_ENV === 'development' ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI_PRODUCTION;
        const connect = await mongoose.connect(DB_URI);
        await initializeSemesterYears();
        await initializedRoles();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
