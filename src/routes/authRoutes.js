const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const { protect } = require('../middlewares/auth.middlewares');
const { validate } = require('../middlewares/validateMiddlewares');
const {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} = require('../validations/authValidation');

// Routes publiques
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Route protégée
router.post('/logout', protect, authController.logout);

module.exports = router;