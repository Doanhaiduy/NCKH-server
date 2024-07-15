const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./src/configs/db');
const errorHandlerMiddleware = require('./src/middlewares/errorHandlerMiddleware');

const AuthRouter = require('./src/routes/authRouter');
const UsersRouter = require('./src/routes/userRouter');
const PostRouter = require('./src/routes/postRouter');
const RoleRouter = require('./src/routes/roleRouter');

//dotenv config
dotenv.config();

//db connection
connectDB();

//init express
const app = express();
const PORT = process.env.PORT || 3000;

//middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(errorHandlerMiddleware);

//routes
app.get('/', (req, res) => {
    res.send('Server is ready!!');
});

app.use(`/api/v1/auth`, AuthRouter);
app.use(`/api/v1/users`, UsersRouter);
app.use(`/api/v1/posts`, PostRouter);
app.use(`/api/v1/utils`, RoleRouter);

//listen
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});
