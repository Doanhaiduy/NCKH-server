const express = require('express');
const Router = express.Router();
const { GetUsers, UploadAvatar } = require('../controllers/userController');
const upload = require('../configs/multer');

Router.get('/', GetUsers);
Router.post('/upload', upload.single('avatar'), UploadAvatar);

module.exports = Router;
