const express = require('express');

const { isLoggedIn, isNotLoggedIn } = require('../middlewares');
const { join, login, logout } = require('../controllers/auth');

const router = express.Router();

router.post('/join', join, isNotLoggedIn);

router.post('/login', isNotLoggedIn, login);

router.get('/logout', logout, isLoggedIn);

module.exports = router;