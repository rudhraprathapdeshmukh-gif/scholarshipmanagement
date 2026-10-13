const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration from environment
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'scholarhub';
const DB_MODE = (process.env.DB_MODE || 'auto').toLowerCase();

const LOCAL_DATA_FILE = path.join(__dirname, 'scholarhub_local.json');

let pool = null;
let activeEngine = 'none'; // 'mysql' or 'embedded'
let memoryStore = null;

// Initial default seed dataset localized for India
const getDefaultSeedData = () => {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const studentHash = bcrypt.hashSync('Student@123', salt);

  return {
    users: [
      { id: 1, full_name: 'VNRVJIET Scholarship Cell Officer', email: 'admin@vnrvjiet.ac.in', password_hash: adminHash, role: 'admin', phone: '+91-98490-12345', created_at: '2025-01-01 00:00:00' },
      { id: 2, full_name: 'K. Sai Praneeth', email: 'student@vnrvjiet.in', password_hash: studentHash, role: 'student', phone: '+91-98480-44552', created_at: '2025-01-10 10:00:00' },
      { id: 3, full_name: 'M. Ananya Reddy', email: 'ananya.reddy@vnrvjiet.in', password_hash: studentHash, role: 'student', phone: '+91-99492-88771', created_at: '2025-01-15 11:30:00' },
      { id: 4, full_name: 'B. Rahul Varma', email: 'rahul.varma@vnrvjiet.in', password_hash: studentHash, role: 'student', phone: '+91-97015-33442', created_at: '2025-01-20 09:15:00' }
    ],
    student_profiles: [
      { id: 1, user_id: 2, date_of_birth: '2004-05-14', gender: 'Male', category: 'General', family_annual_income: 450000, education_level: 'Undergraduate', course_name: 'B.Tech Computer Science & Engineering (Roll: 23071A0542)', institution_name: 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad', gpa_or_percentage: 8.85, state: 'Telangana', address: 'Plot 45, Nizampet Road, Kukatpally, Hyderabad - 500072', is_verified: 1 },
      { id: 2, user_id: 3, date_of_birth: '2003-11-20', gender: 'Female', category: 'OBC', family_annual_income: 240000, education_level: 'Undergraduate', course_name: 'B.Tech Electronics & Communication Engineering (Roll: 23071A0419)', institution_name: 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad', gpa_or_percentage: 9.20, state: 'Telangana', address: 'H.No 3-5-112, Pragathi Nagar, Bachupally, Hyderabad - 500090', is_verified: 1 },
      { id: 3, user_id: 4, date_of_birth: '2004-02-10', gender: 'Male', category: 'SC', family_annual_income: 180000, education_level: 'Undergraduate', course_name: 'B.Tech Information Technology (Roll: 24071A1208)', institution_name: 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad', gpa_or_percentage: 7.80, state: 'Telangana', address: 'Miyapur Allwyn X Roads, Hyderabad - 500049', is_verified: 0 }
    ],
    scholarships: [
      { id: 1, title: 'Reliance Foundation Undergraduate Scholarship 2026-27', provider_name: 'Reliance Foundation', description: 'Merit-cum-means financial assistance for undergraduate students in India across degree streams.', category: 'Merit-cum-Means', min_gpa: 7.50, max_income: 600000, education_level: 'Undergraduate', award_amount: 200000, currency: 'INR', deadline: '2026-12-15', application_url: 'https://www.reliancefoundation.org', slots_available: 50, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 2, title: 'AICTE Pragati Scholarship for Girl Students (NSP 2026-27)', provider_name: 'AICTE & Ministry of Education, Govt. of India', description: 'Government of India technical education grant exclusively for meritorious female students admitted to AICTE recognized institutions.', category: 'Girls in STEM', min_gpa: 8.00, max_income: 800000, education_level: 'Undergraduate', award_amount: 50000, currency: 'INR', deadline: '2026-12-31', application_url: 'https://www.aicte-india.org', slots_available: 100, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 3, title: 'Tata Trusts Medical & Healthcare Higher Studies Grant', provider_name: 'Tata Trusts', description: 'Education support grant for students pursuing professional degrees in Medicine (MBBS), BDS, Nursing and Pharmacy.', category: 'Merit-based', min_gpa: 8.50, max_income: 500000, education_level: 'Undergraduate', award_amount: 150000, currency: 'INR', deadline: '2027-02-28', application_url: 'https://www.tatatrusts.org', slots_available: 25, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 4, title: 'HDFC Bank Parivartan’s ECSS Education Relief Scheme', provider_name: 'HDFC Bank CSR Initiative', description: 'Annual educational grant for students pursuing school and college education.', category: 'Means-based', min_gpa: 6.00, max_income: 250000, education_level: 'All', award_amount: 75000, currency: 'INR', deadline: '2026-12-30', application_url: 'https://www.hdfcbank.com', slots_available: 120, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 5, title: 'Infosys Foundation STEM Stars Scholarship Program', provider_name: 'Infosys Foundation India', description: 'Tuition and academic allowance for high-achieving female engineering students admitted to premier accredited institutes.', category: 'Girls in STEM', min_gpa: 8.20, max_income: 800000, education_level: 'Undergraduate', award_amount: 100000, currency: 'INR', deadline: '2027-01-31', application_url: 'https://www.infosys.com/infosys-foundation', slots_available: 40, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 6, title: 'Central Sector Scheme of Scholarships (PM-USP / NSP)', provider_name: 'Department of Higher Education, Ministry of Education, Govt. of India', description: 'National Scholarship Portal scheme for college and university students scoring above 80th percentile in Class 12 board examinations.', category: 'Merit-based', min_gpa: 8.00, max_income: 450000, education_level: 'Undergraduate', award_amount: 20000, currency: 'INR', deadline: '2026-11-30', application_url: 'https://scholarships.gov.in', slots_available: 250, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 7, title: 'ONGC Foundation Scholarship for SC/ST/OBC Students', provider_name: 'Oil and Natural Gas Corporation (ONGC)', description: 'Affirmative action educational grant for SC, ST and OBC community students studying Engineering, MBBS, MBA or Geophysics.', category: 'SC/ST/OBC', min_gpa: 6.50, max_income: 200000, education_level: 'Undergraduate', award_amount: 48000, currency: 'INR', deadline: '2026-12-20', application_url: 'https://ongcscholar.org', slots_available: 80, status: 'active', created_by: 1, created_at: '2026-06-01' },
      { id: 8, title: 'National Overseas Fellowship for Ph.D. & Masters (MoSJE)', provider_name: 'Ministry of Social Justice & Empowerment, Govt. of India', description: 'Government of India international fellowship financing overseas Masters and Doctoral studies at top 500 world ranked universities.', category: 'Postgraduate & Research', min_gpa: 7.50, max_income: 800000, education_level: 'Postgraduate', award_amount: 500000, currency: 'INR', deadline: '2027-03-31', application_url: 'https://nosmsje.gov.in', slots_available: 15, status: 'active', created_by: 1, created_at: '2026-06-01' }
    ],
    applications: [],
    activity_logs: []
  };
};

function saveLocalData() {
  if (memoryStore) {
    try {
      fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB Storage] Failed to persist local JSON:', err.message);
    }
  }
}

function loadLocalData() {
  if (fs.existsSync(LOCAL_DATA_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      memoryStore = JSON.parse(content);
      
      // Ensure VNRVJIET users exist
      const defaultData = getDefaultSeedData();
      defaultData.users.forEach(defUser => {
        const found = memoryStore.users.find(u => u.email.toLowerCase() === defUser.email.toLowerCase());
        if (!found) {
          memoryStore.users.push(defUser);
        }
      });
      defaultData.student_profiles.forEach(defProf => {
        const foundProf = memoryStore.student_profiles.find(p => p.user_id === defProf.user_id);
        if (!foundProf) {
          memoryStore.student_profiles.push(defProf);
        }
      });

      // Ensure array fields exist
      if (!Array.isArray(memoryStore.applications)) memoryStore.applications = [];
      if (!Array.isArray(memoryStore.activity_logs)) memoryStore.activity_logs = [];

      saveLocalData();
      return;
    } catch (err) {
      console.warn('[DB Storage] Corrupt local data file, rebuilding seed:', err.message);
    }
  }
  memoryStore = getDefaultSeedData();
  saveLocalData();
}

/**
 * Initialize database connection:
 * Tries MySQL first if DB_MODE is 'auto' or 'mysql'.
 * Falls back cleanly to local persistent storage if MySQL is not available.
 */
async function initializeDatabase() {
  // In production cloud environments without external MySQL configured, default directly to embedded mode
  const isCloudWithoutMySQL = process.env.NODE_ENV === 'production' && (!process.env.DB_HOST || process.env.DB_HOST === 'localhost');
  if (isCloudWithoutMySQL && DB_MODE === 'auto') {
    console.log('[DB Connector] Cloud deployment detected without external MySQL host. Running in embedded mode.');
    activeEngine = 'embedded';
    loadLocalData();
    return { engine: 'embedded' };
  }

  if (DB_MODE === 'mysql' || DB_MODE === 'auto') {
    try {
      console.log(`[DB Connector] Connecting to MySQL at ${DB_HOST}:${DB_PORT} as user '${DB_USER}'...`);
      const tempConn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        connectTimeout: 3000
      });

      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await tempConn.end();

      pool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      const [tableCheck] = await pool.query(`SHOW TABLES LIKE 'users'`);
      if (tableCheck.length === 0) {
        console.log(`[DB Connector] Database '${DB_NAME}' tables not found. Initializing schema...`);
        const schemaPath = path.join(__dirname, 'schema_simple.sql');
        if (fs.existsSync(schemaPath)) {
          const sqlFile = fs.readFileSync(schemaPath, 'utf8');
          const statements = sqlFile
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

          for (const statement of statements) {
            try {
              await pool.query(statement);
            } catch (err) {
              // Ignore non-fatal
            }
          }
          console.log('[DB Connector] Schema & Indian seed dataset applied successfully.');
        }
      }

      activeEngine = 'mysql';
      console.log(`[DB Connector] Connected successfully to MySQL Database: ${DB_NAME}`);
      return { engine: 'mysql' };
    } catch (mysqlErr) {
      if (DB_MODE === 'mysql') {
        console.error('[DB Connector] MySQL connection failed and DB_MODE is "mysql":', mysqlErr.message);
        throw mysqlErr;
      }
      console.warn(`[DB Connector] MySQL server unavailable (${mysqlErr.message}). Switching seamlessly to embedded persistent data storage...`);
    }
  }

  activeEngine = 'embedded';
  loadLocalData();
  console.log(`[DB Connector] Running in Embedded Mode with file persistence: ${LOCAL_DATA_FILE}`);
  return { engine: 'embedded' };
}

// ====================================================================
// Query Abstraction Layer
// ====================================================================

const db = {
  getEngine: () => activeEngine,

  async query(sql, params = []) {
    if (activeEngine === 'mysql' && pool) {
      return await pool.query(sql, params);
    }
    throw new Error('Raw query not supported in embedded mode.');
  },

  async findUserByEmail(email) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
      return rows[0] || null;
    }
    loadLocalData();
    return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const term = identifier.trim().toLowerCase();

    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(full_name) = ? OR LOWER(full_name) LIKE ?',
        [term, term, `%${term}%`]
      );
      return rows[0] || null;
    }
    loadLocalData();
    // 1. Exact email match
    let match = memoryStore.users.find(u => u.email.toLowerCase() === term);
    if (match) return match;

    // 2. Exact or partial full_name match
    match = memoryStore.users.find(u => u.full_name.toLowerCase() === term);
    if (match) return match;

    // 3. Name contains the search string
    match = memoryStore.users.find(u => u.full_name.toLowerCase().includes(term));
    if (match) return match;

    return null;
  },

  async findUserById(id) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query('SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    }
    loadLocalData();
    const u = memoryStore.users.find(u => u.id === parseInt(id, 10));
    if (!u) return null;
    const { password_hash, ...safeUser } = u;
    return safeUser;
  },

  async createUser({ full_name, email, password_hash, role = 'student', phone = null }) {
    if (activeEngine === 'mysql' && pool) {
      const [res] = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, password_hash, role, phone]
      );
      return res.insertId;
    }
    loadLocalData();
    const newId = memoryStore.users.length ? Math.max(...memoryStore.users.map(u => u.id)) + 1 : 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    memoryStore.users.push({
      id: newId,
      full_name,
      email,
      password_hash,
      role,
      phone,
      created_at: now
    });
    if (role === 'student') {
      memoryStore.student_profiles.push({
        id: memoryStore.student_profiles.length ? Math.max(...memoryStore.student_profiles.map(p => p.id)) + 1 : 1,
        user_id: newId,
        date_of_birth: null,
        gender: 'Prefer not to say',
        category: 'General',
        family_annual_income: 0,
        education_level: 'Undergraduate',
        course_name: '',
        institution_name: '',
        gpa_or_percentage: 0.0,
        state: '',
        address: '',
        is_verified: 0
      });
    }
    saveLocalData();
    return newId;
  },

  async getAllStudents() {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(`
        SELECT u.id, u.id AS user_id, u.full_name, u.email, u.phone, u.created_at,
               sp.id AS profile_id,
               sp.date_of_birth, sp.gender, sp.category, sp.family_annual_income,
               sp.education_level, sp.course_name, sp.institution_name,
               sp.gpa_or_percentage, sp.state, sp.address,
               COALESCE(sp.is_verified, 0) AS is_verified,
               (SELECT COUNT(*) FROM applications a WHERE a.student_id = u.id) AS applications_count
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.role = 'student'
        ORDER BY u.created_at DESC
      `);
      return rows;
    }
    loadLocalData();
    return memoryStore.users
      .filter(u => u.role === 'student')
      .map(u => {
        const profile = memoryStore.student_profiles.find(p => p.user_id === u.id) || {};
        const appCount = (memoryStore.applications || []).filter(a => a.student_id === u.id).length;
        const { password_hash, ...safeUser } = u;
        const { id: profileId, user_id, ...profileData } = profile;
        return {
          ...profileData,
          ...safeUser,
          id: u.id,
          user_id: u.id,
          profile_id: profileId,
          is_verified: profile.is_verified ? 1 : 0,
          applications_count: appCount
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getStudentProfile(userId) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(`
        SELECT sp.*, u.full_name, u.email, u.phone
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id = ?
      `, [userId]);
      return rows[0] || null;
    }
    loadLocalData();
    const user = memoryStore.users.find(u => u.id === parseInt(userId, 10));
    if (!user) return null;
    let profile = memoryStore.student_profiles.find(p => p.user_id === parseInt(userId, 10));
    if (!profile) {
      profile = {
        id: memoryStore.student_profiles.length ? Math.max(...memoryStore.student_profiles.map(p => p.id)) + 1 : 1,
        user_id: user.id,
        date_of_birth: null,
        gender: 'Prefer not to say',
        category: 'General',
        family_annual_income: 0,
        education_level: 'Undergraduate',
        course_name: '',
        institution_name: '',
        gpa_or_percentage: 0.0,
        state: '',
        address: '',
        is_verified: 0
      };
      memoryStore.student_profiles.push(profile);
      saveLocalData();
    }
    return {
      ...profile,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone
    };
  },

  async updateStudentProfile(userId, data) {
    const {
      date_of_birth, gender, category, family_annual_income,
      education_level, course_name, institution_name,
      gpa_or_percentage, state, address, phone
    } = data;

    if (activeEngine === 'mysql' && pool) {
      if (phone !== undefined) {
        await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
      }
      const [existing] = await pool.query('SELECT id FROM student_profiles WHERE user_id = ?', [userId]);
      if (existing.length > 0) {
        await pool.query(`
          UPDATE student_profiles SET
            date_of_birth = ?, gender = ?, category = ?, family_annual_income = ?,
            education_level = ?, course_name = ?, institution_name = ?,
            gpa_or_percentage = ?, state = ?, address = ?
          WHERE user_id = ?
        `, [
          date_of_birth || null, gender || 'Prefer not to say', category || 'General',
          family_annual_income || 0, education_level || 'Undergraduate',
          course_name || '', institution_name || '', gpa_or_percentage || 0,
          state || '', address || '', userId
        ]);
      } else {
        await pool.query(`
          INSERT INTO student_profiles (
            user_id, date_of_birth, gender, category, family_annual_income,
            education_level, course_name, institution_name, gpa_or_percentage, state, address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, date_of_birth || null, gender || 'Prefer not to say', category || 'General',
          family_annual_income || 0, education_level || 'Undergraduate',
          course_name || '', institution_name || '', gpa_or_percentage || 0,
          state || '', address || ''
        ]);
      }
      return true;
    }

    loadLocalData();
    if (phone !== undefined) {
      const u = memoryStore.users.find(u => u.id === parseInt(userId, 10));
      if (u) u.phone = phone;
    }
    let p = memoryStore.student_profiles.find(p => p.user_id === parseInt(userId, 10));
    if (p) {
      Object.assign(p, {
        date_of_birth: date_of_birth !== undefined ? date_of_birth : p.date_of_birth,
        gender: gender || p.gender,
        category: category || p.category,
        family_annual_income: family_annual_income !== undefined ? parseFloat(family_annual_income) : p.family_annual_income,
        education_level: education_level || p.education_level,
        course_name: course_name !== undefined ? course_name : p.course_name,
        institution_name: institution_name !== undefined ? institution_name : p.institution_name,
        gpa_or_percentage: gpa_or_percentage !== undefined ? parseFloat(gpa_or_percentage) : p.gpa_or_percentage,
        state: state !== undefined ? state : p.state,
        address: address !== undefined ? address : p.address
      });
    } else {
      p = {
        id: memoryStore.student_profiles.length ? Math.max(...memoryStore.student_profiles.map(p => p.id)) + 1 : 1,
        user_id: parseInt(userId, 10),
        date_of_birth, gender, category, family_annual_income: parseFloat(family_annual_income || 0),
        education_level, course_name, institution_name,
        gpa_or_percentage: parseFloat(gpa_or_percentage || 0),
        state, address, is_verified: 0
      };
      memoryStore.student_profiles.push(p);
    }
    saveLocalData();
    return true;
  },

  async verifyStudent(userId, isVerified) {
    const verifiedInt = isVerified ? 1 : 0;
    const uid = parseInt(userId, 10);
    if (activeEngine === 'mysql' && pool) {
      const [existing] = await pool.query('SELECT id FROM student_profiles WHERE user_id = ?', [uid]);
      if (existing.length > 0) {
        await pool.query('UPDATE student_profiles SET is_verified = ? WHERE user_id = ?', [verifiedInt, uid]);
      } else {
        await pool.query('INSERT INTO student_profiles (user_id, is_verified) VALUES (?, ?)', [uid, verifiedInt]);
      }
      return true;
    }
    loadLocalData();
    let p = memoryStore.student_profiles.find(p => p.user_id === uid);
    if (p) {
      p.is_verified = verifiedInt;
    } else {
      p = {
        id: memoryStore.student_profiles.length ? Math.max(...memoryStore.student_profiles.map(pr => pr.id)) + 1 : 1,
        user_id: uid,
        date_of_birth: null,
        gender: 'Prefer not to say',
        category: 'General',
        family_annual_income: 0,
        education_level: 'Undergraduate',
        course_name: '',
        institution_name: '',
        gpa_or_percentage: 0.0,
        state: '',
        address: '',
        is_verified: verifiedInt
      };
      memoryStore.student_profiles.push(p);
    }
    saveLocalData();
    return true;
  },

  async getScholarships(filters = {}) {
    const { search, category, education_level, min_gpa, max_income, status = 'all' } = filters;

    if (activeEngine === 'mysql' && pool) {
      let sql = `
        SELECT s.*,
               (SELECT COUNT(*) FROM applications a WHERE a.scholarship_id = s.id) AS total_applicants
        FROM scholarships s
        WHERE 1=1
      `;
      const params = [];

      if (status !== 'all') {
        sql += ' AND s.status = ?';
        params.push(status);
        if (status === 'active') {
          sql += ' AND s.deadline >= CURDATE()';
        }
      }
      if (category && category !== 'All') {
        sql += ' AND s.category = ?';
        params.push(category);
      }
      if (education_level && education_level !== 'All') {
        sql += ' AND (s.education_level = ? OR s.education_level = "All")';
        params.push(education_level);
      }
      if (min_gpa) {
        sql += ' AND s.min_gpa <= ?';
        params.push(parseFloat(min_gpa));
      }
      if (max_income) {
        sql += ' AND (s.max_income = 0 OR s.max_income >= ?)';
        params.push(parseFloat(max_income));
      }
      if (search) {
        sql += ' AND (s.title LIKE ? OR s.provider_name LIKE ? OR s.description LIKE ?)';
        const queryTerm = `%${search}%`;
        params.push(queryTerm, queryTerm, queryTerm);
      }

      sql += ' ORDER BY s.deadline ASC';
      const [rows] = await pool.query(sql, params);
      return rows;
    }

    loadLocalData();
    const todayStr = new Date().toISOString().substring(0, 10);
    return memoryStore.scholarships
      .filter(s => {
        if (status !== 'all' && s.status !== status) return false;
        if (status === 'active' && s.deadline < todayStr) return false;
        if (category && category !== 'All' && s.category !== category) return false;
        if (education_level && education_level !== 'All' && s.education_level !== 'All' && s.education_level !== education_level) return false;
        if (min_gpa && parseFloat(s.min_gpa) > parseFloat(min_gpa)) return false;
        if (max_income && s.max_income > 0 && parseFloat(s.max_income) < parseFloat(max_income)) return false;
        if (search) {
          const q = search.toLowerCase();
          const match = s.title.toLowerCase().includes(q) ||
                        s.provider_name.toLowerCase().includes(q) ||
                        s.description.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map(s => {
        const applicants = memoryStore.applications.filter(a => a.scholarship_id === s.id).length;
        return { ...s, total_applicants: applicants };
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  },

  async getScholarshipById(id) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(`
        SELECT s.*,
               (SELECT COUNT(*) FROM applications a WHERE a.scholarship_id = s.id) AS total_applicants
        FROM scholarships s
        WHERE s.id = ?
      `, [id]);
      return rows[0] || null;
    }
    loadLocalData();
    const s = memoryStore.scholarships.find(s => s.id === parseInt(id, 10));
    if (!s) return null;
    const applicants = memoryStore.applications.filter(a => a.scholarship_id === s.id).length;
    return { ...s, total_applicants: applicants };
  },

  async createScholarship(data, adminId) {
    const {
      title, provider_name, description, category, min_gpa = 0,
      max_income = 0, education_level = 'All', award_amount,
      currency = 'INR', deadline, application_url, slots_available = 10,
      status = 'active'
    } = data;

    if (activeEngine === 'mysql' && pool) {
      const [res] = await pool.query(`
        INSERT INTO scholarships (
          title, provider_name, description, category, min_gpa, max_income,
          education_level, award_amount, currency, deadline, application_url,
          slots_available, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title, provider_name, description, category, min_gpa, max_income,
        education_level, award_amount, currency, deadline, application_url,
        slots_available, status, adminId
      ]);
      return res.insertId;
    }

    loadLocalData();
    const newId = memoryStore.scholarships.length ? Math.max(...memoryStore.scholarships.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString().substring(0, 10);
    const newSch = {
      id: newId,
      title, provider_name, description, category,
      min_gpa: parseFloat(min_gpa || 0),
      max_income: parseFloat(max_income || 0),
      education_level,
      award_amount: parseFloat(award_amount),
      currency: currency || 'INR',
      deadline, application_url,
      slots_available: parseInt(slots_available || 10, 10),
      status: status || 'active',
      created_by: adminId,
      created_at: now
    };
    memoryStore.scholarships.push(newSch);
    saveLocalData();
    return newId;
  },

  async updateScholarship(id, data) {
    if (activeEngine === 'mysql' && pool) {
      const fields = [];
      const params = [];
      const allowed = ['title', 'provider_name', 'description', 'category', 'min_gpa',
                       'max_income', 'education_level', 'award_amount', 'currency',
                       'deadline', 'application_url', 'slots_available', 'status'];
      for (const key of allowed) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(data[key]);
        }
      }
      if (fields.length === 0) return true;
      params.push(id);
      await pool.query(`UPDATE scholarships SET ${fields.join(', ')} WHERE id = ?`, params);
      return true;
    }

    loadLocalData();
    const s = memoryStore.scholarships.find(s => s.id === parseInt(id, 10));
    if (!s) return false;
    Object.assign(s, data);
    saveLocalData();
    return true;
  },

  async deleteScholarship(id) {
    if (activeEngine === 'mysql' && pool) {
      await pool.query('DELETE FROM scholarships WHERE id = ?', [id]);
      return true;
    }
    loadLocalData();
    const idx = memoryStore.scholarships.findIndex(s => s.id === parseInt(id, 10));
    if (idx !== -1) {
      memoryStore.scholarships.splice(idx, 1);
      memoryStore.applications = memoryStore.applications.filter(a => a.scholarship_id !== parseInt(id, 10));
      saveLocalData();
    }
    return true;
  },

  async checkExistingApplication(studentId, scholarshipId) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(
        'SELECT * FROM applications WHERE student_id = ? AND scholarship_id = ?',
        [studentId, scholarshipId]
      );
      return rows[0] || null;
    }
    loadLocalData();
    return memoryStore.applications.find(
      a => a.student_id === parseInt(studentId, 10) && a.scholarship_id === parseInt(scholarshipId, 10)
    ) || null;
  },

  async createApplication({ studentId, scholarshipId, officialRefNumber, studentNotes }) {
    if (activeEngine === 'mysql' && pool) {
      const [res] = await pool.query(`
        INSERT INTO applications (student_id, scholarship_id, official_ref_number, student_notes, status)
        VALUES (?, ?, ?, ?, 'submitted')
      `, [studentId, scholarshipId, officialRefNumber, studentNotes]);
      return res.insertId;
    }

    loadLocalData();
    const newId = memoryStore.applications.length ? Math.max(...memoryStore.applications.map(a => a.id)) + 1 : 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newApp = {
      id: newId,
      student_id: parseInt(studentId, 10),
      scholarship_id: parseInt(scholarshipId, 10),
      applied_date: now,
      status: 'submitted',
      official_ref_number: officialRefNumber,
      student_notes: studentNotes,
      admin_feedback: null,
      reviewed_by: null,
      reviewed_at: null
    };
    memoryStore.applications.push(newApp);
    saveLocalData();
    return newId;
  },

  async getStudentApplications(studentId) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(`
        SELECT a.*,
               u.full_name AS student_name,
               u.email AS student_email,
               u.phone AS student_phone,
               sp.course_name,
               sp.institution_name,
               sp.education_level,
               sp.gpa_or_percentage,
               s.title AS scholarship_title,
               s.provider_name,
               s.category AS scholarship_category,
               s.award_amount,
               s.currency,
               s.deadline,
               s.application_url
        FROM applications a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        JOIN scholarships s ON a.scholarship_id = s.id
        WHERE a.student_id = ?
        ORDER BY a.applied_date DESC
      `, [studentId]);
      return rows;
    }

    loadLocalData();
    const sid = parseInt(studentId, 10);
    const student = memoryStore.users.find(u => u.id === sid) || {};
    const profile = memoryStore.student_profiles.find(p => p.user_id === sid) || {};
    return (memoryStore.applications || [])
      .filter(a => parseInt(a.student_id, 10) === sid)
      .map(a => {
        const s = memoryStore.scholarships.find(sch => parseInt(sch.id, 10) === parseInt(a.scholarship_id, 10)) || {};
        return {
          ...a,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_phone: student.phone || 'N/A',
          course_name: profile.course_name || 'B.Tech',
          institution_name: profile.institution_name || 'VNR Vignana Jyothi Institute of Engineering and Technology',
          education_level: profile.education_level || 'Undergraduate',
          gpa_or_percentage: profile.gpa_or_percentage || 0,
          scholarship_title: s.title || 'Unknown Scholarship',
          provider_name: s.provider_name || 'N/A',
          scholarship_category: s.category || 'N/A',
          award_amount: s.award_amount || 0,
          currency: s.currency || 'INR',
          deadline: s.deadline || 'N/A',
          application_url: s.application_url || null
        };
      })
      .sort((a, b) => new Date(b.applied_date) - new Date(a.applied_date));
  },

  async getAllApplications(filters = {}) {
    const { status, scholarshipId } = filters;

    if (activeEngine === 'mysql' && pool) {
      let sql = `
        SELECT a.*,
               u.full_name AS student_name,
               u.email AS student_email,
               u.phone AS student_phone,
               sp.gpa_or_percentage,
               sp.family_annual_income,
               sp.institution_name,
               sp.course_name,
               sp.education_level,
               sp.is_verified AS student_is_verified,
               s.title AS scholarship_title,
               s.provider_name,
               s.category,
               s.award_amount,
               s.currency,
               s.deadline,
               reviewer.full_name AS reviewer_name
        FROM applications a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        JOIN scholarships s ON a.scholarship_id = s.id
        LEFT JOIN users reviewer ON a.reviewed_by = reviewer.id
        WHERE 1=1
      `;
      const params = [];
      if (status && status !== 'all') {
        sql += ' AND a.status = ?';
        params.push(status);
      }
      if (scholarshipId) {
        sql += ' AND a.scholarship_id = ?';
        params.push(scholarshipId);
      }
      sql += ' ORDER BY a.applied_date DESC';
      const [rows] = await pool.query(sql, params);
      return rows;
    }

    loadLocalData();
    return memoryStore.applications
      .filter(a => {
        if (status && status !== 'all' && a.status !== status) return false;
        if (scholarshipId && a.scholarship_id !== parseInt(scholarshipId, 10)) return false;
        return true;
      })
      .map(a => {
        const student = memoryStore.users.find(u => u.id === a.student_id) || {};
        const profile = memoryStore.student_profiles.find(p => p.user_id === a.student_id) || {};
        const scholarship = memoryStore.scholarships.find(s => s.id === a.scholarship_id) || {};
        const reviewer = a.reviewed_by ? memoryStore.users.find(u => u.id === a.reviewed_by) : null;
        return {
          ...a,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_phone: student.phone || 'N/A',
          gpa_or_percentage: profile.gpa_or_percentage || 0,
          family_annual_income: profile.family_annual_income || 0,
          institution_name: profile.institution_name || 'N/A',
          course_name: profile.course_name || 'N/A',
          education_level: profile.education_level || 'N/A',
          student_is_verified: profile.is_verified || 0,
          scholarship_title: scholarship.title || 'N/A',
          provider_name: scholarship.provider_name || 'N/A',
          category: scholarship.category || 'N/A',
          award_amount: scholarship.award_amount || 0,
          currency: scholarship.currency || 'INR',
          deadline: scholarship.deadline || 'N/A',
          reviewer_name: reviewer ? reviewer.full_name : null
        };
      })
      .sort((a, b) => new Date(b.applied_date) - new Date(a.applied_date));
  },

  async updateApplicationStatus(appId, { status, adminFeedback, adminId }) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (activeEngine === 'mysql' && pool) {
      await pool.query(`
        UPDATE applications
        SET status = ?, admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, adminFeedback, adminId, appId]);

      if (status === 'awarded') {
        await pool.query(`
          UPDATE scholarships s
          JOIN applications a ON s.id = a.scholarship_id
          SET s.slots_available = GREATEST(0, s.slots_available - 1)
          WHERE a.id = ?
        `, [appId]);
      }
      return true;
    }

    loadLocalData();
    const app = memoryStore.applications.find(a => a.id === parseInt(appId, 10));
    if (!app) return false;
    const oldStatus = app.status;
    app.status = status;
    app.admin_feedback = adminFeedback;
    app.reviewed_by = adminId;
    app.reviewed_at = now;

    if (status === 'awarded' && oldStatus !== 'awarded') {
      const sch = memoryStore.scholarships.find(s => s.id === app.scholarship_id);
      if (sch && sch.slots_available > 0) {
        sch.slots_available -= 1;
      }
    }
    saveLocalData();
    return true;
  },

  async logActivity(userId, action, details) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (activeEngine === 'mysql' && pool) {
      try {
        await pool.query(
          'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
          [userId, action, details]
        );
      } catch (err) {
        // ignore
      }
      return;
    }

    loadLocalData();
    const newId = memoryStore.activity_logs.length ? Math.max(...memoryStore.activity_logs.map(l => l.id)) + 1 : 1;
    memoryStore.activity_logs.push({
      id: newId,
      user_id: userId,
      action,
      details,
      created_at: now
    });
    saveLocalData();
  },

  async getRecentLogs(limit = 15) {
    if (activeEngine === 'mysql' && pool) {
      const [rows] = await pool.query(`
        SELECT a.*, u.full_name, u.role
        FROM activity_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT ?
      `, [limit]);
      return rows;
    }

    loadLocalData();
    return memoryStore.activity_logs
      .map(log => {
        const u = memoryStore.users.find(usr => usr.id === log.user_id);
        return {
          ...log,
          full_name: u ? u.full_name : 'National Portal',
          role: u ? u.role : 'system'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  async getSystemStats() {
    if (activeEngine === 'mysql' && pool) {
      const [[usersCount]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = "student"');
      const [[scholarshipsCount]] = await pool.query('SELECT COUNT(*) AS total FROM scholarships WHERE status = "active"');
      const [[appsCount]] = await pool.query('SELECT COUNT(*) AS total FROM applications');
      const [[pendingCount]] = await pool.query('SELECT COUNT(*) AS total FROM applications WHERE status IN ("submitted", "under_review")');
      const [[awardedCount]] = await pool.query('SELECT COUNT(*) AS total FROM applications WHERE status = "awarded"');
      const [[disbursedSum]] = await pool.query(`
        SELECT COALESCE(SUM(s.award_amount), 0) AS total_disbursed
        FROM applications a
        JOIN scholarships s ON a.scholarship_id = s.id
        WHERE a.status = "awarded"
      `);

      return {
        total_students: usersCount.total,
        total_scholarships: scholarshipsCount.total,
        total_applications: appsCount.total,
        pending_reviews: pendingCount.total,
        awarded_applications: awardedCount.total,
        total_disbursed: disbursedSum.total_disbursed
      };
    }

    loadLocalData();
    const students = memoryStore.users.filter(u => u.role === 'student').length;
    const activeSch = memoryStore.scholarships.filter(s => s.status === 'active').length;
    const totalApps = memoryStore.applications.length;
    const pendingApps = memoryStore.applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
    const awardedApps = memoryStore.applications.filter(a => a.status === 'awarded').length;
    const totalDisbursed = memoryStore.applications
      .filter(a => a.status === 'awarded')
      .reduce((sum, a) => {
        const sch = memoryStore.scholarships.find(s => s.id === a.scholarship_id);
        return sum + (sch ? sch.award_amount : 0);
      }, 0);

    return {
      total_students: students,
      total_scholarships: activeSch,
      total_applications: totalApps,
      pending_reviews: pendingApps,
      awarded_applications: awardedApps,
      total_disbursed: totalDisbursed
    };
  },

  async clearAllApplications() {
    if (activeEngine === 'mysql' && pool) {
      await pool.query('DELETE FROM applications');
      await pool.query('DELETE FROM activity_logs');
      return { success: true };
    }
    loadLocalData();
    memoryStore.applications = [];
    memoryStore.activity_logs = [];
    // Reset slot quantities
    memoryStore.scholarships.forEach(s => {
      if (s.id === 1) s.slots_available = 50;
      if (s.id === 2) s.slots_available = 100;
      if (s.id === 3) s.slots_available = 25;
      if (s.id === 4) s.slots_available = 120;
      if (s.id === 5) s.slots_available = 40;
      if (s.id === 6) s.slots_available = 250;
      if (s.id === 7) s.slots_available = 80;
      if (s.id === 8) s.slots_available = 15;
    });
    saveLocalData();
    return { success: true };
  }
};

module.exports = {
  initializeDatabase,
  db
};
