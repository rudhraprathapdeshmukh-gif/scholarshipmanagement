/**
 * ScholarHub Authentication & Role-Based Navigation Controller
 */

const auth = {
  currentUser: null,

  // Initialize authentication state on page load
  async init() {
    this.currentUser = api.getUser();
    if (api.getToken() && this.currentUser) {
      try {
        // Validate session token with server
        const res = await api.get('/auth/me');
        if (res.success) {
          this.currentUser = res.user;
          api.setUser(res.user);
        }
      } catch (err) {
        // Token expired or invalid
        this.logout(false);
      }
    }
    this.renderNavigation();
  },

  // Check login state
  isAuthenticated() {
    return !!api.getToken() && !!this.currentUser;
  },

  // Check role
  isStudent() {
    return this.isAuthenticated() && this.currentUser.role === 'student';
  },

  isAdmin() {
    return this.isAuthenticated() && this.currentUser.role === 'admin';
  },

  // Dynamic Role-based Navigation Render
  renderNavigation() {
    const navLinksContainer = document.getElementById('nav-links');
    const navUserContainer = document.getElementById('nav-user-area');

    if (!navLinksContainer || !navUserContainer) return;

    if (!this.isAuthenticated()) {
      // -------------------------------------------------------------
      // 1. Logged Out (Guest) View:
      // Show: Home, Browse Scholarships, Eligibility Matcher, About
      // Show Auth: Login, Register
      // Hide: Student pages, Admin pages
      // -------------------------------------------------------------
      navLinksContainer.innerHTML = `
        <li><a class="nav-link" data-view="home" href="#home"><i class="fas fa-home"></i> Home</a></li>
        <li><a class="nav-link" data-view="scholarships" href="#scholarships"><i class="fas fa-graduation-cap"></i> Browse Scholarships</a></li>
        <li><a class="nav-link" data-view="about" href="#about"><i class="fas fa-info-circle"></i> About</a></li>
      `;

      navUserContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="app.showModal('modal-login')">
          <i class="fas fa-sign-in-alt"></i> Log In
        </button>
        <button class="btn btn-primary btn-sm" onclick="app.showModal('modal-register')">
          <i class="fas fa-user-plus"></i> Student Sign Up
        </button>
      `;
    } else if (this.isStudent()) {
      // -------------------------------------------------------------
      // 2. Student Role View:
      // Show: Browse Scholarships, My Applications, My Profile, Matched Scholarships
      // Hide: Login, Register, Admin Dashboard, Admin tools
      // -------------------------------------------------------------
      navLinksContainer.innerHTML = `
        <li><a class="nav-link" data-view="home" href="#home"><i class="fas fa-home"></i> Home</a></li>
        <li><a class="nav-link" data-view="scholarships" href="#scholarships"><i class="fas fa-search"></i> Browse Scholarships</a></li>
        <li><a class="nav-link" data-view="student-applications" href="#student-applications"><i class="fas fa-tasks"></i> My Applications</a></li>
        <li><a class="nav-link" data-view="about" href="#about"><i class="fas fa-info-circle"></i> About</a></li>
        <li>
          <a class="nav-link user-badge-link" data-view="student-profile" href="#student-profile" style="color: var(--primary); font-weight: 700; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-full); padding: 0.35rem 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis;">
            <i class="fas fa-user-graduate"></i>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${app.escapeHtml(this.currentUser.full_name)}</span>
            <span class="role-pill student" style="flex-shrink: 0;">Student</span>
          </a>
        </li>
      `;

      navUserContainer.innerHTML = ``;
    } else if (this.isAdmin()) {
      // -------------------------------------------------------------
      // 3. Admin Role View:
      // Show: Admin Dashboard, Manage Scholarships, Review Applications, Student Directory, Audit Logs
      // Hide: Login, Register, Student-only pages
      // -------------------------------------------------------------
      navLinksContainer.innerHTML = `
        <li><a class="nav-link" data-view="admin-dashboard" href="#admin-dashboard"><i class="fas fa-th-large"></i> Dashboard</a></li>
        <li><a class="nav-link" data-view="admin-applications" href="#admin-applications"><i class="fas fa-clipboard-check"></i> Clearance Requests</a></li>
        <li><a class="nav-link" data-view="admin-students" href="#admin-students"><i class="fas fa-users"></i> Students</a></li>
      `;

      navUserContainer.innerHTML = `
        <div class="user-badge" style="cursor: pointer;" onclick="app.switchView('admin-dashboard')" title="Go to Dashboard">
          <i class="fas fa-shield-alt"></i>
          <span>${app.escapeHtml(this.currentUser.full_name)}</span>
          <span class="role-pill admin">Admin</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="auth.logout()" title="Logout" style="padding:0.25rem 0.6rem; font-size:0.8rem; margin-left:0.4rem;">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      `;
    }

    // Attach click events to nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        if (targetView) {
          app.switchView(targetView);
        }
      });
    });
  },

  // Perform Login
  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btnSubmit = document.getElementById('btn-login-submit');

    if (!email || !password) {
      app.showToast('Please fill in both email and password.', 'error');
      return;
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        api.setToken(res.token);
        api.setUser(res.user);
        this.currentUser = res.user;

        app.closeModal('modal-login');
        app.showToast(`Welcome back, ${res.user.full_name}!`, 'success');

        this.renderNavigation();

        // Redirect based on role
        if (res.user.role === 'admin') {
          app.switchView('admin-dashboard');
        } else {
          app.switchView('student-applications');
        }
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Log In';
    }
  },

  // Education Level Branches Configuration
  branchesConfig: {
    'Undergraduate': [
      'B.Tech - Computer Science & Engineering (CSE)',
      'B.Tech - CSE (Artificial Intelligence & Machine Learning)',
      'B.Tech - CSE (Data Science)',
      'B.Tech - CSE (Cyber Security)',
      'B.Tech - Computer Science & Business Systems (CSBS)',
      'B.Tech - Information Technology (IT)',
      'B.Tech - Electronics & Communication Engineering (ECE)',
      'B.Tech - Electrical & Electronics Engineering (EEE)',
      'B.Tech - Electronics & Instrumentation Engineering (EIE)',
      'B.Tech - Mechanical Engineering (ME)',
      'B.Tech - Civil Engineering (CE)',
      'B.Tech - Automobile Engineering (AE)'
    ],
    'Postgraduate': [
      'M.Tech - Advanced Manufacturing Systems (AMS)',
      'M.Tech - Computer Science & Engineering (CSE)',
      'M.Tech - Embedded Systems (ES)',
      'M.Tech - Power Electronics (PE)',
      'M.Tech - Structural Engineering (SE)',
      'M.Tech - VLSI System Design (VLSI)',
      'M.Tech - Highway Engineering'
    ]
  },

  // Dynamic branch updater for Registration modal
  handleEduLevelChange(selectedBranch = '') {
    const levelSelect = document.getElementById('reg-edu-level');
    const courseSelect = document.getElementById('reg-course');
    if (!levelSelect || !courseSelect) return;

    const level = levelSelect.value === 'Postgraduate' ? 'Postgraduate' : 'Undergraduate';
    const branches = this.branchesConfig[level] || [];

    courseSelect.innerHTML = '<option value="">Select Branch</option>';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      if (selectedBranch && b === selectedBranch) {
        opt.selected = true;
      }
      courseSelect.appendChild(opt);
    });
  },

  // Perform Student Registration
  async handleRegister(event) {
    event.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const eduLevel = document.getElementById('reg-edu-level').value;
    const course = document.getElementById('reg-course').value.trim();
    const institution = 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad';
    const gpa = document.getElementById('reg-gpa').value;
    const income = document.getElementById('reg-income').value;
    const btnSubmit = document.getElementById('btn-register-submit');

    // Strict Validations
    if (!fullName) {
      app.showToast('Please enter your full legal name.', 'error');
      document.getElementById('reg-fullname').focus();
      return;
    }

    if (!email) {
      app.showToast('Please enter your email address.', 'error');
      document.getElementById('reg-email').focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      app.showToast('Please enter a valid email format (e.g., student@vnrvjiet.in).', 'error');
      document.getElementById('reg-email').focus();
      return;
    }

    if (!password || password.length < 6) {
      app.showToast('Password must be at least 6 characters long.', 'error');
      document.getElementById('reg-password').focus();
      return;
    }

    if (eduLevel !== 'Undergraduate' && eduLevel !== 'Postgraduate') {
      app.showToast('Education level must be either Undergraduate or Postgraduate.', 'error');
      document.getElementById('reg-edu-level').focus();
      return;
    }

    if (!course) {
      app.showToast(`Please select your degree branch for ${eduLevel} study.`, 'error');
      document.getElementById('reg-course').focus();
      return;
    }

    // Validate branch matches education level
    const allowedBranches = this.branchesConfig[eduLevel] || [];
    if (!allowedBranches.includes(course)) {
      app.showToast(`Selected branch "${course}" is not valid for ${eduLevel}. Please select a valid branch.`, 'error');
      document.getElementById('reg-course').focus();
      return;
    }

    // Validate GPA if provided
    if (gpa !== '' && gpa !== null && gpa !== undefined) {
      const gpaNum = parseFloat(gpa);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 100) {
        app.showToast('CGPA/Percentage must be a number between 0.0 and 100.0.', 'error');
        document.getElementById('reg-gpa').focus();
        return;
      }
    }

    // Validate Income if provided
    if (income !== '' && income !== null && income !== undefined) {
      const incNum = parseFloat(income);
      if (isNaN(incNum) || incNum < 0) {
        app.showToast('Annual income must be a valid non-negative amount.', 'error');
        document.getElementById('reg-income').focus();
        return;
      }
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

      const res = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        phone,
        education_level: eduLevel,
        course_name: course,
        institution_name: institution,
        gpa_or_percentage: gpa,
        family_annual_income: income
      });

      if (res.success) {
        api.setToken(res.token);
        api.setUser(res.user);
        this.currentUser = res.user;

        app.closeModal('modal-register');
        app.showToast('Account successfully created! Welcome to ScholarHub.', 'success');

        this.renderNavigation();
        app.switchView('student-profile');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Create Student Account';
    }
  },

  // Fill Quick Demo Login Credentials (VNRVJIET)
  fillDemoCredentials(role) {
    if (role === 'admin') {
      document.getElementById('login-email').value = 'admin@vnrvjiet.ac.in';
      document.getElementById('login-password').value = 'Admin@123';
      app.showToast('Filled VNRVJIET Scholarship Cell Officer credentials.', 'info');
    } else if (role === 'student') {
      document.getElementById('login-email').value = 'student@vnrvjiet.in';
      document.getElementById('login-password').value = 'Student@123';
      app.showToast('Filled VNRVJIET Student credentials (K. Sai Praneeth - CSE).', 'info');
    }
  },

  // Perform Logout
  logout(notify = true) {
    api.setToken(null);
    api.setUser(null);
    this.currentUser = null;
    this.renderNavigation();
    app.switchView('home');
    if (notify) {
      app.showToast('You have been logged out securely.', 'info');
    }
  }
};
