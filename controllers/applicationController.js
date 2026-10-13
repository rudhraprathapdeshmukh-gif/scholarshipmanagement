const { db } = require('../database/db');

/**
 * Student applies for a scholarship
 */
exports.apply = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { scholarship_id, official_ref_number, student_notes } = req.body;

    if (!scholarship_id) {
      return res.status(400).json({
        success: false,
        message: 'Scholarship ID is required.'
      });
    }

    const scholarship = await db.getScholarshipById(parseInt(scholarship_id, 10));
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'The requested scholarship does not exist.'
      });
    }

    if (scholarship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This scholarship is currently ${scholarship.status} and cannot accept new applications.`
      });
    }

    // Check if deadline has passed
    const todayStr = new Date().toISOString().substring(0, 10);
    if (scholarship.deadline < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'The application deadline for this scholarship has passed.'
      });
    }

    // Check duplicate
    const existing = await db.checkExistingApplication(studentId, scholarship.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this scholarship.'
      });
    }

    // Generate reference code if not provided
    const refCode = official_ref_number && official_ref_number.trim()
      ? official_ref_number.trim()
      : `SCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const appId = await db.createApplication({
      studentId,
      scholarshipId: scholarship.id,
      officialRefNumber: refCode,
      studentNotes: student_notes ? student_notes.trim() : 'Applied through ScholarHub portal.'
    });

    await db.logActivity(
      studentId,
      'APPLICATION_SUBMISSION',
      `Student applied for "${scholarship.title}" (Ref #${refCode})`
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Track your status on your dashboard.',
      applicationId: appId,
      referenceNumber: refCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current student's applications
 */
exports.getMyApplications = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const applications = await db.getStudentApplications(studentId);

    // Compute status stats
    const stats = {
      total: applications.length,
      submitted: applications.filter(a => a.status === 'submitted').length,
      under_review: applications.filter(a => a.status === 'under_review').length,
      verified: applications.filter(a => a.status === 'verified').length,
      awarded: applications.filter(a => a.status === 'awarded').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };

    res.json({
      success: true,
      stats,
      applications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all applications with filters
 */
exports.getAllApplications = async (req, res, next) => {
  try {
    const { status, scholarshipId } = req.query;
    const applications = await db.getAllApplications({ status, scholarshipId });

    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update application review status & feedback
 */
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { status, admin_feedback } = req.body;

    const validStatuses = ['submitted', 'under_review', 'verified', 'rejected', 'awarded'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const success = await db.updateApplicationStatus(appId, {
      status,
      adminFeedback: admin_feedback || '',
      adminId: req.user.id
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    await db.logActivity(
      req.user.id,
      'APPLICATION_REVIEWED',
      `Admin updated Application #${appId} to status "${status}" with feedback.`
    );

    res.json({
      success: true,
      message: `Application #${appId} status updated to "${status}".`
    });
  } catch (error) {
    next(error);
  }
};
