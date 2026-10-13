const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireStudent } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Authenticated user profile routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/profile', ...requireStudent, authController.getStudentProfile);
router.put('/profile', ...requireStudent, authController.updateStudentProfile);

module.exports = router;
