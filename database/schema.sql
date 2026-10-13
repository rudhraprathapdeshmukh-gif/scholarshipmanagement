-- ====================================================================
-- ScholarHub – Scholarship Management System (DBMS CBP Project)
-- Relational Database Schema, Views, Triggers, Stored Procedures & Seed
-- Target RDBMS: MySQL 8.0+ / MariaDB 10.4+
-- ====================================================================

-- 1. Create and Select Database
CREATE DATABASE IF NOT EXISTS scholarhub_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE scholarhub_db;

-- --------------------------------------------------------------------
-- Drop existing tables, views, procedures, and triggers if any (Clean slate)
-- --------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_application_update;
DROP TRIGGER IF EXISTS trg_decrement_slots_on_award;
DROP PROCEDURE IF EXISTS sp_get_eligible_scholarships;
DROP PROCEDURE IF EXISTS sp_update_application_status;
DROP VIEW IF EXISTS view_student_statistics;
DROP VIEW IF EXISTS view_application_summaries;
DROP VIEW IF EXISTS view_active_scholarships;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS scholarships;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;

-- ====================================================================
-- Table 1: users (Authentication & Core Identification)
-- ====================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- ====================================================================
-- Table 2: student_profiles (Detailed Academic & Financial Profile)
-- ====================================================================
CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    date_of_birth DATE DEFAULT NULL,
    gender ENUM('Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say') DEFAULT 'Prefer not to say',
    category VARCHAR(50) DEFAULT 'General',
    family_annual_income DECIMAL(12, 2) DEFAULT 0.00,
    education_level ENUM('High School', 'Undergraduate', 'Postgraduate', 'Doctorate') DEFAULT 'Undergraduate',
    course_name VARCHAR(150) DEFAULT NULL,
    institution_name VARCHAR(200) DEFAULT NULL,
    gpa_or_percentage DECIMAL(4, 2) DEFAULT 0.00,
    state VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profile_education (education_level),
    INDEX idx_profile_gpa (gpa_or_percentage),
    INDEX idx_profile_income (family_annual_income)
) ENGINE=InnoDB;

-- ====================================================================
-- Table 3: scholarships (Scholarship Schemes & Eligibility Criteria)
-- ====================================================================
CREATE TABLE scholarships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('Merit-based', 'Means-based', 'STEM', 'Minority', 'Sports', 'International', 'Women in Tech') NOT NULL,
    min_gpa DECIMAL(4, 2) DEFAULT 0.00,
    max_income DECIMAL(12, 2) DEFAULT 0.00,
    education_level ENUM('All', 'High School', 'Undergraduate', 'Postgraduate', 'Doctorate') DEFAULT 'All',
    award_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    deadline DATE NOT NULL,
    application_url VARCHAR(500) DEFAULT NULL,
    slots_available INT DEFAULT 10,
    status ENUM('active', 'closed', 'upcoming') DEFAULT 'active',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_scholarship_category (category),
    INDEX idx_scholarship_deadline (deadline),
    INDEX idx_scholarship_status (status)
) ENGINE=InnoDB;

-- ====================================================================
-- Table 4: applications (Student Applications & Verification Workflow)
-- ====================================================================
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    scholarship_id INT NOT NULL,
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('submitted', 'under_review', 'verified', 'rejected', 'awarded') DEFAULT 'submitted',
    official_ref_number VARCHAR(100) DEFAULT NULL,
    student_notes TEXT DEFAULT NULL,
    admin_feedback TEXT DEFAULT NULL,
    reviewed_by INT DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_scholarship (student_id, scholarship_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_app_student (student_id),
    INDEX idx_app_scholarship (scholarship_id),
    INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ====================================================================
-- Table 5: activity_logs (System Audit Trail)
-- ====================================================================
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ====================================================================
-- Database Views
-- ====================================================================

-- View 1: Active scholarships with days remaining
CREATE VIEW view_active_scholarships AS
SELECT 
    s.id,
    s.title,
    s.provider_name,
    s.category,
    s.award_amount,
    s.currency,
    s.deadline,
    DATEDIFF(s.deadline, CURDATE()) AS days_remaining,
    s.min_gpa,
    s.max_income,
    s.education_level,
    s.slots_available,
    s.status,
    s.application_url,
    (SELECT COUNT(*) FROM applications a WHERE a.scholarship_id = s.id) AS total_applicants
FROM scholarships s
WHERE s.status = 'active';

-- View 2: Comprehensive Application Summaries with Student & Scholarship Details
CREATE VIEW view_application_summaries AS
SELECT 
    a.id AS application_id,
    a.applied_date,
    a.status AS application_status,
    a.official_ref_number,
    a.student_notes,
    a.admin_feedback,
    a.reviewed_at,
    u.id AS student_id,
    u.full_name AS student_name,
    u.email AS student_email,
    u.phone AS student_phone,
    sp.education_level AS student_education,
    sp.course_name,
    sp.institution_name,
    sp.gpa_or_percentage,
    sp.family_annual_income,
    sp.is_verified AS student_is_verified,
    s.id AS scholarship_id,
    s.title AS scholarship_title,
    s.provider_name,
    s.award_amount,
    s.currency,
    s.deadline,
    admin.full_name AS reviewer_name
FROM applications a
JOIN users u ON a.student_id = u.id
LEFT JOIN student_profiles sp ON u.id = sp.user_id
JOIN scholarships s ON a.scholarship_id = s.id
LEFT JOIN users admin ON a.reviewed_by = admin.id;

-- View 3: Student-centric Statistics
CREATE VIEW view_student_statistics AS
SELECT 
    u.id AS student_id,
    u.full_name,
    COUNT(a.id) AS total_applications,
    SUM(CASE WHEN a.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
    SUM(CASE WHEN a.status = 'under_review' THEN 1 ELSE 0 END) AS under_review_count,
    SUM(CASE WHEN a.status = 'verified' THEN 1 ELSE 0 END) AS verified_count,
    SUM(CASE WHEN a.status = 'awarded' THEN 1 ELSE 0 END) AS awarded_count,
    SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
FROM users u
LEFT JOIN applications a ON u.id = a.student_id
WHERE u.role = 'student'
GROUP BY u.id, u.full_name;

-- ====================================================================
-- Database Triggers
-- ====================================================================

-- Trigger 1: Log status changes in applications
DELIMITER //
CREATE TRIGGER trg_after_application_update
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO activity_logs (user_id, action, details)
        VALUES (
            NEW.student_id,
            'APPLICATION_STATUS_CHANGED',
            CONCAT('Application #', NEW.id, ' status changed from "', OLD.status, '" to "', NEW.status, '" by Reviewer #', IFNULL(NEW.reviewed_by, 'System'))
        );
    END IF;
END //
DELIMITER ;

-- Trigger 2: Automatically decrement available slots when an application is awarded
DELIMITER //
CREATE TRIGGER trg_decrement_slots_on_award
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF NEW.status = 'awarded' AND OLD.status <> 'awarded' THEN
        UPDATE scholarships 
        SET slots_available = GREATEST(0, slots_available - 1)
        WHERE id = NEW.scholarship_id;
    END IF;
END //
DELIMITER ;

-- ====================================================================
-- Stored Procedures
-- ====================================================================

-- Stored Procedure 1: Find Eligible Scholarships for a Student
DELIMITER //
CREATE PROCEDURE sp_get_eligible_scholarships(IN in_student_id INT)
BEGIN
    DECLARE v_gpa DECIMAL(4, 2);
    DECLARE v_income DECIMAL(12, 2);
    DECLARE v_edu VARCHAR(50);

    -- Fetch student profile values
    SELECT gpa_or_percentage, family_annual_income, education_level
    INTO v_gpa, v_income, v_edu
    FROM student_profiles
    WHERE user_id = in_student_id;

    -- Return matching scholarships
    SELECT 
        s.*,
        DATEDIFF(s.deadline, CURDATE()) AS days_remaining,
        CASE 
            WHEN (v_gpa >= s.min_gpa) AND (s.max_income = 0 OR v_income <= s.max_income) 
                 AND (s.education_level = 'All' OR s.education_level = v_edu) THEN 1
            ELSE 0 
        END AS is_fully_eligible
    FROM scholarships s
    WHERE s.status = 'active'
      AND s.deadline >= CURDATE()
      AND (s.min_gpa = 0.00 OR v_gpa >= s.min_gpa)
      AND (s.max_income = 0.00 OR v_income <= s.max_income)
      AND (s.education_level = 'All' OR s.education_level = v_edu)
    ORDER BY s.deadline ASC;
END //
DELIMITER ;

-- Stored Procedure 2: Securely Update Application Review Status
DELIMITER //
CREATE PROCEDURE sp_update_application_status(
    IN in_app_id INT,
    IN in_status VARCHAR(20),
    IN in_admin_id INT,
    IN in_feedback TEXT
)
BEGIN
    UPDATE applications
    SET 
        status = in_status,
        reviewed_by = in_admin_id,
        admin_feedback = in_feedback,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = in_app_id;
END //
DELIMITER ;

-- ====================================================================
-- Initial Seed Data
-- ====================================================================

-- 1. Default Users (Pass: 'Admin@123' and 'Student@123')
-- Bcrypt Hash for Admin@123: $2a$10$7R9Pqv0GzB6L0R7F.02fze8iQ1c8FhJ7T7v4d3H6E5Q0Y.8aL3fXW
-- Bcrypt Hash for Student@123: $2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW
INSERT INTO users (id, full_name, email, password_hash, role, phone) VALUES
(1, 'System Administrator', 'admin@scholarhub.org', '$2a$10$7R9Pqv0GzB6L0R7F.02fze8iQ1c8FhJ7T7v4d3H6E5Q0Y.8aL3fXW', 'admin', '+1-800-555-0199'),
(2, 'Alex Chen', 'alex.chen@university.edu', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+1-555-014-8821'),
(3, 'Priya Sharma', 'priya.sharma@college.edu', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+1-555-019-3342'),
(4, 'Marcus Vance', 'marcus.vance@tech.edu', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+1-555-012-7711');

-- 2. Student Profiles
INSERT INTO student_profiles (user_id, date_of_birth, gender, category, family_annual_income, education_level, course_name, institution_name, gpa_or_percentage, state, address, is_verified) VALUES
(2, '2003-05-14', 'Male', 'General', 45000.00, 'Undergraduate', 'B.S. in Computer Science', 'Pacific State University', 3.85, 'California', '742 Evergreen Terrace, San Jose, CA', TRUE),
(3, '2002-11-20', 'Female', 'Minority', 28000.00, 'Postgraduate', 'M.S. in Data Intelligence', 'Metropolitan Institute of Technology', 3.92, 'New York', '124 Conch Street, Albany, NY', TRUE),
(4, '2004-02-10', 'Male', 'Means-based', 19500.00, 'Undergraduate', 'B.Eng. Mechanical Engineering', 'Midwest Polytechnic', 3.40, 'Illinois', '455 Oak Lane, Chicago, IL', FALSE);

-- 3. Realistic Scholarships
INSERT INTO scholarships (id, title, provider_name, description, category, min_gpa, max_income, education_level, award_amount, currency, deadline, application_url, slots_available, status, created_by) VALUES
(1, 'Global STEM Excellence Fellowship 2025', 'National Science & Tech Council', 'Supports exceptionally driven students pursuing undergraduate and postgraduate degrees in science, technology, engineering, and mathematics disciplines.', 'STEM', 3.50, 60000.00, 'All', 7500.00, 'USD', '2025-12-15', 'https://www.nsf.gov/fellowships', 15, 'active', 1),
(2, 'NextGen Women in Computing Grant', 'Grace Hopper Foundation', 'Dedicated financial aid program aimed at empowering female students excelling in Software Engineering, Artificial Intelligence, and Computer Science.', 'Women in Tech', 3.40, 75000.00, 'Undergraduate', 5000.00, 'USD', '2025-11-30', 'https://ghc.anitab.org/awards', 8, 'active', 1),
(3, 'Pinnacle Academic Merit Scholarship', 'Apex Global Foundation', 'Prestigious award recognizing scholastic distinction and extracurricular leadership across all accredited higher-education academic majors.', 'Merit-based', 3.80, 0.00, 'All', 10000.00, 'USD', '2025-12-31', 'https://www.apexscholars.org', 5, 'active', 1),
(4, 'Opportunity Pathway Need-Based Assistance', 'Higher Horizons Alliance', 'Provides tuition reduction and cost-of-living subsidies to students demonstrating substantial financial necessity.', 'Means-based', 2.80, 35000.00, 'Undergraduate', 4500.00, 'USD', '2025-11-15', 'https://www.horizonpathway.org/apply', 25, 'active', 1),
(5, 'Future Leaders Graduate Research Grant', 'Vanguard Institute of Sciences', 'Financial grant assisting high-achieving master\'s and doctoral candidates pursuing disruptive research and publications.', 'Merit-based', 3.75, 50000.00, 'Postgraduate', 12000.00, 'USD', '2026-01-15', 'https://www.vanguardresearch.edu/grants', 4, 'active', 1),
(6, 'Empower Diverse Voices Fellowship', 'Diversity First Coalition', 'Aimed at elevating underrepresented students with academic merit and strong community involvement.', 'Minority', 3.00, 40000.00, 'All', 6000.00, 'USD', '2025-10-31', 'https://www.diversityfirst.org/fellowship', 12, 'active', 1),
(7, 'Varsity Collegiate Athletic Honor Award', 'National Sports Collegiate Board', 'Recognizes exceptional varsity collegiate athletes balancing rigorous academic pursuits with athletic competition.', 'Sports', 3.00, 0.00, 'Undergraduate', 4000.00, 'USD', '2025-12-01', 'https://www.collegiatesports.org/awards', 10, 'active', 1),
(8, 'Cross-Border International Scholar Grant', 'World Education Council', 'Supports international students studying abroad at accredited domestic institutions.', 'International', 3.20, 50000.00, 'All', 8500.00, 'USD', '2026-02-28', 'https://www.worldedu.org/international', 6, 'active', 1);


