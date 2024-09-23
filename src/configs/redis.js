const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    password: process.env.NODE_ENV === 'development' ? undefined : process.env.REDIS_PASSWORD,
});

redisClient.on('connect', () => {
    console.log('Connect to Redis successfully');
});

redisClient.on('error', (error) => {
    console.error(`Error: ${error}`);
});

const connectRedis = async () => {
    await redisClient.connect();
};

module.exports = { redisClient, connectRedis };
