-- ====================================================================
-- ScholarHub India – National Scholarship Management System
-- Relational Database Schema & Realistic Indian Seed Data
-- ====================================================================

CREATE DATABASE IF NOT EXISTS scholarhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scholarhub;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS scholarships;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;

-- 1. users Table
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

-- 2. student_profiles Table
CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    date_of_birth DATE DEFAULT NULL,
    gender ENUM('Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say') DEFAULT 'Prefer not to say',
    category VARCHAR(50) DEFAULT 'General',
    family_annual_income DECIMAL(12, 2) DEFAULT 0.00,
    education_level ENUM('10th/12th / Diploma', 'Undergraduate', 'Postgraduate', 'Ph.D. / Research') DEFAULT 'Undergraduate',
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

-- 3. scholarships Table
CREATE TABLE scholarships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    provider_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('Merit-based', 'Means-based', 'Merit-cum-Means', 'Girls in STEM', 'SC/ST/OBC', 'Minority', 'Postgraduate & Research') NOT NULL,
    min_gpa DECIMAL(4, 2) DEFAULT 0.00,
    max_income DECIMAL(12, 2) DEFAULT 0.00,
    education_level ENUM('All', '10th/12th / Diploma', 'Undergraduate', 'Postgraduate', 'Ph.D. / Research') DEFAULT 'All',
    award_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    deadline DATE NOT NULL,
    application_url VARCHAR(500) DEFAULT NULL,
    slots_available INT DEFAULT 50,
    status ENUM('active', 'closed', 'upcoming') DEFAULT 'active',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_scholarship_category (category),
    INDEX idx_scholarship_deadline (deadline),
    INDEX idx_scholarship_status (status)
) ENGINE=InnoDB;

-- 4. applications Table
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

-- 5. activity_logs Table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed Data (Indian Context)
-- Password for all demo accounts: 'Admin@123' and 'Student@123'
INSERT INTO users (id, full_name, email, password_hash, role, phone) VALUES
(1, 'National Portal Administrator', 'admin@scholarhub.in', '$2a$10$7R9Pqv0GzB6L0R7F.02fze8iQ1c8FhJ7T7v4d3H6E5Q0Y.8aL3fXW', 'admin', '+91-98110-12345'),
(2, 'Aarav Sharma', 'aarav.sharma@iitb.ac.in', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+91-98201-44552'),
(3, 'Priya Patel', 'priya.patel@vjti.ac.in', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+91-99302-88771'),
(4, 'Rohan Verma', 'rohan.verma@delhi.ac.in', '$2a$10$4nC0Gq1qZk4l8S2F4w3ehe8L7v6X8Z1Q7u2k5I9O8F4E6Q1Y3p2aW', 'student', '+91-97115-33442');

INSERT INTO student_profiles (user_id, date_of_birth, gender, category, family_annual_income, education_level, course_name, institution_name, gpa_or_percentage, state, address, is_verified) VALUES
(2, '2004-05-14', 'Male', 'General', 450000.00, 'Undergraduate', 'B.Tech in Computer Science & Engineering', 'IIT Bombay, Powai', 8.85, 'Maharashtra', 'B-402, Green Meadows, Powai, Mumbai - 400076', TRUE),
(3, '2003-11-20', 'Female', 'OBC', 240000.00, 'Undergraduate', 'B.Tech in Information Technology', 'VJTI, Matunga, Mumbai', 9.20, 'Maharashtra', 'Plot 12, Tilak Nagar, Pune - 411002', TRUE),
(4, '2004-02-10', 'Male', 'SC', 180000.00, 'Undergraduate', 'B.Sc in Computer Science', 'St. Stephen\'s College, Delhi University', 7.80, 'Delhi', 'Sector 4, Rohini, New Delhi - 110085', FALSE);

INSERT INTO scholarships (id, title, provider_name, description, category, min_gpa, max_income, education_level, award_amount, currency, deadline, application_url, slots_available, status, created_by) VALUES
(1, 'Reliance Foundation Undergraduate Scholarship 2026-27', 'Reliance Foundation', 'Merit-cum-means financial assistance for undergraduate students in India across degree streams.', 'Merit-cum-Means', 7.50, 600000.00, 'Undergraduate', 200000.00, 'INR', '2026-12-15', 'https://www.reliancefoundation.org', 50, 'active', 1),
(2, 'AICTE Pragati Scholarship for Girl Students (NSP 2026-27)', 'AICTE & Ministry of Education, Govt. of India', 'Government of India technical education grant exclusively for meritorious female students admitted to AICTE recognized institutions.', 'Girls in STEM', 8.00, 800000.00, 'Undergraduate', 50000.00, 'INR', '2026-12-31', 'https://www.aicte-india.org', 100, 'active', 1),
(3, 'Tata Trusts Medical & Healthcare Higher Studies Grant', 'Tata Trusts', 'Education support grant for students pursuing professional degrees in Medicine (MBBS), BDS, Nursing and Pharmacy.', 'Merit-based', 8.50, 500000.00, 'Undergraduate', 150000.00, 'INR', '2027-02-28', 'https://www.tatatrusts.org', 25, 'active', 1),
(4, 'HDFC Bank Parivartan’s ECSS Education Relief Scheme', 'HDFC Bank CSR Initiative', 'Annual educational grant for students pursuing school and college education.', 'Means-based', 6.00, 250000.00, 'All', 75000.00, 'INR', '2026-12-30', 'https://www.hdfcbank.com', 120, 'active', 1),
(5, 'Infosys Foundation STEM Stars Scholarship Program', 'Infosys Foundation India', 'Tuition and academic allowance for high-achieving female engineering students admitted to premier accredited institutes.', 'Girls in STEM', 8.20, 800000.00, 'Undergraduate', 100000.00, 'INR', '2027-01-31', 'https://www.infosys.com/infosys-foundation', 40, 'active', 1),
(6, 'Central Sector Scheme of Scholarships (PM-USP / NSP)', 'Department of Higher Education, Ministry of Education, Govt. of India', 'National Scholarship Portal scheme for college and university students scoring above 80th percentile in Class 12 board examinations.', 'Merit-based', 8.00, 450000.00, 'Undergraduate', 200000.00, 'INR', '2026-11-30', 'https://scholarships.gov.in', 250, 'active', 1),
(7, 'ONGC Foundation Scholarship for SC/ST/OBC Students', 'Oil and Natural Gas Corporation (ONGC)', 'Affirmative action educational grant for SC, ST and OBC community students studying Engineering, MBBS, MBA or Geophysics.', 'SC/ST/OBC', 6.50, 200000.00, 'Undergraduate', 48000.00, 'INR', '2026-12-20', 'https://ongcscholar.org', 80, 'active', 1),
(8, 'National Overseas Fellowship for Ph.D. & Masters (MoSJE)', 'Ministry of Social Justice & Empowerment, Govt. of India', 'Government of India international fellowship financing overseas Masters and Doctoral studies at top 500 world ranked universities.', 'Postgraduate & Research', 7.50, 800000.00, 'Postgraduate', 500000.00, 'INR', '2027-03-31', 'https://nosmsje.gov.in', 15, 'active', 1);


