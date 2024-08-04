const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./src/configs/db');
const errorHandlerMiddleware = require('./src/middlewares/errorHandlerMiddleware');
const { connectRedis } = require('./src/configs/redis');

//dotenv config
dotenv.config();

//db connection
connectRedis();
connectDB();

//init express
const app = express();
const PORT = process.env.PORT || 3000;

const routerConfig = require('./src/routes/index');
const { destroyImage } = require('./src/utils/cloudinary');

//middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(process.env.BASE_API_URL, routerConfig());

//routes
app.get('/', (req, res) => {
    res.send('Server is ready!!');
});

app.use(errorHandlerMiddleware);

//listen
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});
