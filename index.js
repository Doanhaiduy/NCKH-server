const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./src/configs/db');
const errorHandlerMiddleware = require('./src/middlewares/errorHandlerMiddleware');
const { connectRedis } = require('./src/configs/redis');
const path = require('path');

//dotenv config
dotenv.config();

//db connection
connectRedis();
connectDB();

//init express
const app = express();
const PORT = process.env.PORT || 3000;

const routerConfig = require('./src/routes/index');
const viewRouter = require('./src/routes/viewRouter');

//middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(
    cors({
        origin: 'http://localhost:3002',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400,
    })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(process.env.BASE_API_URL, routerConfig());
app.use('/views', viewRouter);

//routes
app.get('/', (req, res) => {
    res.send('Server is ready!!');
});
app.use(errorHandlerMiddleware);

//listen
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT} | ${process.env.NODE_ENV}`);
});
