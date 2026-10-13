const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const { authenticateToken, requireAdmin, requireStudent } = require('../middleware/auth');

// Optional auth helper: attaches user if token is present, but doesn't block if absent
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req, res, next);
  }
  next();
}

// Public / Student routes
router.get('/', optionalAuth, scholarshipController.getAllScholarships);
router.get('/matched', ...requireStudent, scholarshipController.getMatchedScholarshipsForStudent);
router.get('/:id', optionalAuth, scholarshipController.getScholarshipById);

// Admin-only CRUD operations
router.post('/', ...requireAdmin, scholarshipController.createScholarship);
router.put('/:id', ...requireAdmin, scholarshipController.updateScholarship);
router.delete('/:id', ...requireAdmin, scholarshipController.deleteScholarship);

module.exports = router;
