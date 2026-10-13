const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { requireStudent, requireAdmin } = require('../middleware/auth');

// Student endpoints
router.post('/apply', ...requireStudent, applicationController.apply);
router.get('/my', ...requireStudent, applicationController.getMyApplications);

// Admin endpoints
router.get('/', ...requireAdmin, applicationController.getAllApplications);
router.patch('/:id/status', ...requireAdmin, applicationController.updateApplicationStatus);

module.exports = router;
