const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// All routes require Admin role
router.use(...requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/students', adminController.getAllStudents);
router.patch('/students/:id/verify', adminController.toggleStudentVerification);
router.get('/activity-logs', adminController.getActivityLogs);
router.post('/clear-dummy', adminController.clearDummyData);

module.exports = router;
