const { db } = require('../database/db');

/**
 * Admin Dashboard KPI statistics
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await db.getSystemStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all registered students with full profiles
 */
exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await db.getAllStudents();
    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle verification badge of student profile
 */
exports.toggleStudentVerification = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_verified } = req.body;

    const student = await db.findUserById(userId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.'
      });
    }

    const verifiedStatus = is_verified === true || is_verified === 1 || is_verified === 'true' || is_verified === '1';
    await db.verifyStudent(userId, verifiedStatus);
    await db.logActivity(
      req.user.id,
      'STUDENT_VERIFICATION_CHANGE',
      `Admin changed verification status of student ${student.full_name} (ID #${userId}) to ${verifiedStatus ? 'VERIFIED' : 'UNVERIFIED'}`
    );

    res.json({
      success: true,
      message: `Student verification status set to ${verifiedStatus ? 'Verified' : 'Unverified'}.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch recent system activity audit logs
 */
exports.getActivityLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const logs = await db.getRecentLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear test/dummy applications and logs
 */
exports.clearDummyData = async (req, res, next) => {
  try {
    await db.clearAllApplications();
    res.json({
      success: true,
      message: 'Dummy applications and activity records cleared successfully.'
    });
  } catch (error) {
    next(error);
  }
};
