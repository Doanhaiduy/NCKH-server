const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

const connectRedis = async () => {
    await redisClient.connect();
};

module.exports = { redisClient, connectRedis };
