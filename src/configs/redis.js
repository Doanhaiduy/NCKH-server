const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    password: process.env.NODE_ENV === 'development' ? undefined : process.env.REDIS_PASSWORD,
    url: 'redis://127.0.0.1:6379',
    socket: {
        connectTimeout: 5000,
    },
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

const handleCache = async (key) => {
    if (process.env.NODE_ENV === 'development') {
        return null;
    }
    const value = await redisClient.get(key);
    if (value) {
        return JSON.parse(value);
    }
    return null;
};

const setCache = async (key, value, time) => {
    if (process.env.NODE_ENV === 'development') {
        return null;
    }
    await redisClient.setEx(key, time, JSON.stringify(value));
};

module.exports = { redisClient, connectRedis, handleCache, setCache };
