const express = require('express');
const Router = express.Router();
const { GetUsers, UploadSingle, UploadMultiple } = require('../controllers/userController');
const upload = require('../configs/multer');

Router.get('/get-all', GetUsers);
Router.post('/upload', upload.single('image'), UploadSingle);
Router.post('/upload-multiple', upload.array('images', 10), UploadMultiple);

module.exports = Router;
