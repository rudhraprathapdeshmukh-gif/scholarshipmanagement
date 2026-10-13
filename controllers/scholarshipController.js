const { db } = require('../database/db');

/**
 * List all scholarships with optional search and filter criteria
 */
exports.getAllScholarships = async (req, res, next) => {
  try {
    const { search, category, education_level, min_gpa, max_income, status } = req.query;

    const scholarships = await db.getScholarships({
      search,
      category,
      education_level,
      min_gpa,
      max_income,
      status: status || (req.user && req.user.role === 'admin' ? 'all' : 'active')
    });

    res.json({
      success: true,
      count: scholarships.length,
      scholarships
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get scholarship by ID with eligibility check for current logged-in student
 */
exports.getScholarshipById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const scholarship = await db.getScholarshipById(id);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found.'
      });
    }

    let eligibilityAnalysis = null;
    let existingApplication = null;

    if (req.user && req.user.role === 'student') {
      const studentProfile = await db.getStudentProfile(req.user.id);
      existingApplication = await db.checkExistingApplication(req.user.id, id);

      if (studentProfile) {
        const meetsGpa = scholarship.min_gpa === 0 || (studentProfile.gpa_or_percentage >= scholarship.min_gpa);
        const meetsIncome = scholarship.max_income === 0 || (studentProfile.family_annual_income <= scholarship.max_income);
        const meetsEducation = scholarship.education_level === 'All' || (scholarship.education_level === studentProfile.education_level);

        eligibilityAnalysis = {
          meetsGpa,
          meetsIncome,
          meetsEducation,
          studentGpa: studentProfile.gpa_or_percentage,
          requiredGpa: scholarship.min_gpa,
          studentIncome: studentProfile.family_annual_income,
          maxIncome: scholarship.max_income,
          studentEducation: studentProfile.education_level,
          requiredEducation: scholarship.education_level,
          isEligible: meetsGpa && meetsIncome && meetsEducation
        };
      }
    }

    res.json({
      success: true,
      scholarship,
      eligibilityAnalysis,
      existingApplication
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check student eligibility against all scholarships
 */
exports.getMatchedScholarshipsForStudent = async (req, res, next) => {
  try {
    const studentProfile = await db.getStudentProfile(req.user.id);
    const allScholarships = await db.getScholarships({ status: 'active' });

    if (!studentProfile) {
      return res.json({
        success: true,
        matched: allScholarships.map(s => ({ ...s, is_fully_eligible: false, reason: 'Profile incomplete' }))
      });
    }

    const matched = allScholarships.map(s => {
      const meetsGpa = s.min_gpa === 0 || (studentProfile.gpa_or_percentage >= s.min_gpa);
      const meetsIncome = s.max_income === 0 || (studentProfile.family_annual_income <= s.max_income);
      const meetsEdu = s.education_level === 'All' || (s.education_level === studentProfile.education_level);

      const isEligible = meetsGpa && meetsIncome && meetsEdu;
      const reasons = [];
      if (!meetsGpa) reasons.push(`Min GPA required: ${s.min_gpa} (Yours: ${studentProfile.gpa_or_percentage})`);
      if (!meetsIncome) reasons.push(`Max Income allowed: $${s.max_income.toLocaleString()} (Yours: $${studentProfile.family_annual_income.toLocaleString()})`);
      if (!meetsEdu) reasons.push(`Required degree: ${s.education_level} (Yours: ${studentProfile.education_level})`);

      return {
        ...s,
        is_fully_eligible: isEligible,
        eligibility_notes: reasons
      };
    });

    res.json({
      success: true,
      count: matched.length,
      matched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new scholarship (Admin only)
 */
exports.createScholarship = async (req, res, next) => {
  try {
    const {
      title, provider_name, description, category, min_gpa,
      max_income, education_level, award_amount, currency,
      deadline, application_url, slots_available, status
    } = req.body;

    if (!title || !provider_name || !award_amount || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, Provider Name, Award Amount, and Deadline are required.'
      });
    }

    const id = await db.createScholarship({
      title: title.trim(),
      provider_name: provider_name.trim(),
      description: description ? description.trim() : 'No description provided.',
      category: category || 'Merit-based',
      min_gpa: min_gpa ? parseFloat(min_gpa) : 0,
      max_income: max_income ? parseFloat(max_income) : 0,
      education_level: education_level || 'All',
      award_amount: parseFloat(award_amount),
      currency: currency || 'USD',
      deadline,
      application_url: application_url ? application_url.trim() : '',
      slots_available: slots_available ? parseInt(slots_available, 10) : 10,
      status: status || 'active'
    }, req.user.id);

    await db.logActivity(req.user.id, 'SCHOLARSHIP_CREATED', `Admin created new scholarship: "${title}" (ID #${id})`);

    const created = await db.getScholarshipById(id);
    res.status(201).json({
      success: true,
      message: 'Scholarship created successfully!',
      scholarship: created
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing scholarship (Admin only)
 */
exports.updateScholarship = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.getScholarshipById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    const {
      title, provider_name, description, category, min_gpa,
      max_income, education_level, award_amount, currency,
      deadline, application_url, slots_available, status
    } = req.body;

    await db.updateScholarship(id, {
      title, provider_name, description, category,
      min_gpa: min_gpa !== undefined ? parseFloat(min_gpa) : undefined,
      max_income: max_income !== undefined ? parseFloat(max_income) : undefined,
      education_level,
      award_amount: award_amount !== undefined ? parseFloat(award_amount) : undefined,
      currency, deadline, application_url,
      slots_available: slots_available !== undefined ? parseInt(slots_available, 10) : undefined,
      status
    });

    await db.logActivity(req.user.id, 'SCHOLARSHIP_UPDATED', `Admin updated scholarship #${id} (${title || existing.title})`);

    const updated = await db.getScholarshipById(id);
    res.json({
      success: true,
      message: 'Scholarship updated successfully!',
      scholarship: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a scholarship (Admin only)
 */
exports.deleteScholarship = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await db.getScholarshipById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    await db.deleteScholarship(id);
    await db.logActivity(req.user.id, 'SCHOLARSHIP_DELETED', `Admin deleted scholarship #${id} (${existing.title})`);

    res.json({
      success: true,
      message: `Scholarship "${existing.title}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
