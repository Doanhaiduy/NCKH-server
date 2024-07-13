const express = require('express');
const { GetPostById, CreatePost, GetPosts } = require('../controllers/postController');
const Router = express.Router();

Router.get('/get-all', GetPosts);
Router.get('/:id', GetPostById);
Router.post('/create', CreatePost);

module.exports = Router;
