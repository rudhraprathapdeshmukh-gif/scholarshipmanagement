const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'scholarhub_super_secret_jwt_key_2025_secure_key';

/**
 * Middleware to verify JSON Web Token
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required. Please log in.'
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired session token. Please log in again.'
        });
      }

      const user = await db.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account associated with this token no longer exists.'
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error: ' + error.message
    });
  }
}

/**
 * Middleware to enforce role-based access
 * @param  {...string} roles Allowed roles ('admin', 'student')
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] role only.`
      });
    }

    next();
  };
}

const requireStudent = [authenticateToken, authorizeRoles('student')];
const requireAdmin = [authenticateToken, authorizeRoles('admin')];

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireStudent,
  requireAdmin
};
