const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./src/configs/db');

//dotenv config
dotenv.config();

//db connection
connectDB();

//init express
const app = express();

//middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

//PORT
const PORT = process.env.PORT || 3000;

//routes
app.get('/', (req, res) => {
    res.send('Server is ready!!');
});

//listen
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});
