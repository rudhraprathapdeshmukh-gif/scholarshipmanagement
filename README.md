# ScholarHub – Scholarship Management System
**Complete Relational Database Management System (DBMS CBP Course Project)**

ScholarHub is a full-stack web application and relational database management system designed to streamline scholarship discovery, eligibility verification, application tracking, and administrative governance.

---

##  System Features

### 1. Student Features
- **Registration & Authentication:** Secure registration with email validation and encrypted passwords (bcrypt).
- **Comprehensive Academic & Financial Profile:** Manage GPA/Percentage, Annual Household Income, Education Level (High School, Undergraduate, Postgraduate, Doctorate), Degree/Course, Institution, and Address.
- **Search & Multi-Criteria Filtering:** Live search by title or provider, category (Merit-based, Means-based, STEM, Women in Tech, Minority, Sports, International), minimum GPA, maximum income, and education level.
- **Automated Eligibility Engine:** Instant visual matching indicators comparing individual student records against scholarship rules.
- **Application Lifecycle Pipeline:** Visual status tracker stepper:
  $$\text{Submitted} \longrightarrow \text{Under Review} \longrightarrow \text{Verified} \longrightarrow \text{Awarded / Rejected}$$
- **Official Portal Integration:** Direct access to official sponsoring agency websites and documentation guidelines.
- **Admin Feedback Notifications:** View official reviewer comments and award decision notes.

### 2. Administrator Features
- **Control Center Analytics:** Real-time KPI metrics for Total Students, Active Scholarships, Pending Applications, and Total Disbursed Funds.
- **Scholarship Scheme Management (CRUD):** Add new grants, update eligibility thresholds, modify available quotas, toggle active/closed states, or delete schemes.
- **Application Review Workflow:** Inspect applicants' academic records, verify credentials, record status changes, and provide custom feedback notes.
- **Student Directory:** View registered students, inspect academic/financial standings, and toggle administrative verification badges (`Verified` vs `Unverified`).
- **Database Audit Trail:** Real-time log of security, application, and system operations.

### 3. Role-Based Access Control (RBAC)
- **Guest / Logged-out:** View public scholarship listings, landing page, and DBMS architectural info. Only sees Log In and Student Sign Up buttons.
- **Student Role:** Navigation dynamically displays *Browse Scholarships*, *My Applications*, *Eligible For Me*, *My Profile*, and student name. All login, register, and admin controls are strictly hidden.
- **Admin Role:** Navigation dynamically displays *Dashboard*, *Manage Scholarships*, *Review Applications*, *Student Directory*, *Audit Logs*, and admin badge. All student and registration options are strictly hidden.

---

##  DBMS Relational Architecture

### Database Schema Diagram & Entities
```
   +-------------------+              +-----------------------+
   |       users       | 1          1 |    student_profiles   |
   +-------------------+<------------>+-----------------------+
   | id (PK)           |              | id (PK)               |
   | full_name         |              | user_id (FK -> users) |
   | email (UQ)        |              | gpa_or_percentage     |
   | password_hash     |              | family_annual_income  |
   | role (ENUM)       |              | education_level       |
   | phone             |              | course_name           |
   +---------+---------+              | institution_name      |
             |                        | is_verified (BOOLEAN) |
             | 1                      +-----------------------+
             |
             | M
   +---------v---------+              +-----------------------+
   |   applications    | M          1 |      scholarships     |
   +-------------------+<------------>+-----------------------+
   | id (PK)           |              | id (PK)               |
   | student_id (FK)   |              | title                 |
   | scholarship_id(FK)|              | provider_name         |
   | applied_date      |              | category (ENUM)       |
   | status (ENUM)     |              | min_gpa               |
   | official_ref_num  |              | max_income            |
   | student_notes     |              | award_amount          |
   | admin_feedback    |              | slots_available       |
   | reviewed_by (FK)  |              | status (ENUM)         |
   +-------------------+              +-----------------------+
             |
             v
   +-------------------+
   |   activity_logs   |
   +-------------------+
   | id (PK)           |
   | user_id (FK)      |
   | action            |
   | details           |
   | created_at        |
   +-------------------+
```

### Relational Schema Highlights (`database/schema.sql`):
1. **Referential Integrity:** `FOREIGN KEY` constraints with `ON DELETE CASCADE` ensures child records (profiles, applications) are kept consistent.
2. **Uniqueness Constraints:** `UNIQUE KEY (student_id, scholarship_id)` strictly prohibits duplicate applications from a student for the same scholarship.
3. **Database Views:**
   - `view_active_scholarships`: Aggregates active grants with live day count and total applicant count.
   - `view_application_summaries`: Joins user, profile, scholarship, and reviewer tables for reporting.
   - `view_student_statistics`: Aggregates submission, review, and award counts per student.
4. **Database Triggers:**
   - `trg_after_application_update`: Automatically appends status transitions into `activity_logs`.
   - `trg_decrement_slots_on_award`: Automatically decrements `slots_available` in `scholarships` whenever an application is marked `awarded`.
5. **Stored Procedures:**
   - `sp_get_eligible_scholarships`: Matches a student's GPA, income, and education against open grants.
   - `sp_update_application_status`: Updates status with administrator audit metadata.

---

## ⚡ Quick Start Guide (Beginner Friendly)

### 1. Prerequisites
- **Node.js** (v16, v18, v20, or newer). Download from [nodejs.org](https://nodejs.org).
- *(Optional)* **MySQL / XAMPP / MariaDB** if you wish to run on a local MySQL server.
  > **Note:** If MySQL is not running on your computer, ScholarHub will **automatically** run in embedded persistence mode (`scholarhub_local.json`) with zero extra configuration or crashes!

---

### 2. Installation Steps

1. **Open your terminal or PowerShell** and navigate to the project directory:
   ```bash
   cd d:\DBMSCBP2
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Verify Environment Configuration (`.env`):**
   The `.env` file comes preconfigured:
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=scholarhub_super_secret_jwt_key_2025_secure_key
   JWT_EXPIRES_IN=7d

   # MySQL Settings
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=scholarhub_db
   DB_MODE=auto
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open in your web browser:**
   ```
   http://localhost:5000
   ```

---

## 🔑 Preconfigured Demo Accounts

You can log in immediately using the one-click demo buttons on the login modal, or type these credentials:

| Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@scholarhub.org` | `Admin@123` | Full access to manage grants, verify students, review applications |
| **Student (Alex)** | `alex.chen@university.edu` | `Student@123` | B.S. CS, GPA 3.85, Income $45,000, 2 Active Applications |
| **Student (Priya)**| `priya.sharma@college.edu` | `Student@123` | M.S. Data, GPA 3.92, Income $28,000, Awarded Grant |

---

## 🗄️ Setting Up with MySQL (XAMPP / MySQL Workbench)

If you want to run ScholarHub directly on your MySQL instance:

1. Start **Apache** and **MySQL** in XAMPP (or launch MySQL Server).
2. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) or **MySQL Workbench**.
3. Create database:
   ```sql
   CREATE DATABASE scholarhub_db;
   ```
4. Import the schema script located at:
   ```
   d:\DBMSCBP2\database\schema.sql
   ```
5. Ensure your `.env` matches your MySQL credentials (default XAMPP has user `root` and empty password).
6. Run `npm start`. The console will display:
   ```
   [DB Connector] Connected successfully to MySQL Database: scholarhub_db
   ```

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` – Register new student account.
- `POST /api/auth/login` – Login student or admin, receives signed JWT.
- `GET /api/auth/me` – Retrieve current user session.
- `GET /api/auth/profile` – Get student academic and financial profile.
- `PUT /api/auth/profile` – Update student GPA, income, degree, and address.

### Scholarships (`/api/scholarships`)
- `GET /api/scholarships` – Search and filter scholarships (query params: `search`, `category`, `education_level`, `min_gpa`, `max_income`).
- `GET /api/scholarships/matched` – Filter scholarships 100% matched to logged-in student profile.
- `GET /api/scholarships/:id` – View details and individual eligibility analysis.
- `POST /api/scholarships` *(Admin)* – Create new scholarship scheme.
- `PUT /api/scholarships/:id` *(Admin)* – Update scholarship details.
- `DELETE /api/scholarships/:id` *(Admin)* – Delete scholarship.

### Applications (`/api/applications`)
- `POST /api/applications/apply` *(Student)* – Apply for scholarship.
- `GET /api/applications/my` *(Student)* – Get student's application history and status.
- `GET /api/applications` *(Admin)* – Get all student applications with filters.
- `PATCH /api/applications/:id/status` *(Admin)* – Update status (`under_review`, `verified`, `awarded`, `rejected`) and leave feedback.

### Admin Operations (`/api/admin`)
- `GET /api/admin/stats` – Dashboard KPIs (students, grants, pending reviews, disbursed funds).
- `GET /api/admin/students` – Directory of registered students.
- `PATCH /api/admin/students/:id/verify` – Toggle verified student status.
- `GET /api/admin/activity-logs` – System activity audit trail.

---

## 🚀 Deployment Instructions

### Option 1: Render / Railway / Heroku
1. Push this folder to a GitHub repository.
2. Link the repository to Render, Railway, or Heroku.
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Configure Environment Variables in the hosting dashboard (`JWT_SECRET`, `NODE_ENV=production`).
6. If connecting to a managed MySQL database (e.g. Railway MySQL, PlanetScale, Aiven), set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Option 2: Docker
Create a `Dockerfile` with:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## 🛡️ Security Best Practices
- **Password Protection:** Uses `bcryptjs` with salt rounds. Raw passwords are never stored or logged.
- **SQL Injection Prevention:** All SQL queries employ prepared statements and parameterized inputs.
- **Role-Based Authorization:** Server-side JWT role validation guards all administrative actions. Client-side hiding of UI elements is paired with strict API endpoint rejection (HTTP 401/403).
- **Environment Keys:** Server secrets and database credentials reside only in `.env` and are never bundled in frontend JavaScript.
