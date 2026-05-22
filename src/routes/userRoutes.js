const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middlewares');
const { getMe } = require('../controllers/user.Controllers');

// Route protégée
router.get('/me', protect, getMe);

module.exports = router;