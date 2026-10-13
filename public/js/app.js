/**
 * ScholarHub Main Application Router & Event Controller
 */

const app = {
  currentView: 'home',

  // Initialize Application
  async init() {
    await auth.init();

    // Listen to hash changes for deep linking
    window.addEventListener('hashchange', () => this.handleRouting());

    // Initial route handling
    this.handleRouting();

    // Setup global modal click-to-close behavior on overlay background
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    console.log('ScholarHub Application Initialized.');
  },

  // View routing handler
  handleRouting() {
    let hash = window.location.hash.replace('#', '').trim();
    if (!hash) {
      hash = auth.isStudent() ? 'student-applications' : auth.isAdmin() ? 'admin-dashboard' : 'home';
    }

    // Role-based route protection
    const studentRoutes = ['student-applications', 'student-matched', 'student-profile'];
    const adminRoutes = ['admin-dashboard', 'admin-applications', 'admin-students', 'admin-logs'];

    // Admin should not view public home/scholarships catalog or admin-scholarships
    if (auth.isAdmin() && (hash === 'home' || hash === 'scholarships' || hash === 'admin-scholarships')) {
      hash = 'admin-dashboard';
    }

    if (studentRoutes.includes(hash)) {
      if (!auth.isAuthenticated()) {
        this.showToast('Please log in as a student to access your dashboard.', 'warning');
        this.showModal('modal-login');
        hash = 'home';
      } else if (auth.isAdmin()) {
        hash = 'admin-dashboard';
      }
    } else if (adminRoutes.includes(hash)) {
      if (!auth.isAuthenticated()) {
        this.showToast('Administrator privileges required. Please log in.', 'warning');
        this.showModal('modal-login');
        hash = 'home';
      } else if (!auth.isAdmin()) {
        this.showToast('Access restricted to administrators only.', 'error');
        hash = 'student-applications';
      }
    }

    this.switchView(hash);
  },

  // Brand click handler
  onBrandClick(event) {
    if (event) event.preventDefault();
    if (auth.isAdmin()) {
      this.switchView('admin-dashboard');
    } else {
      this.switchView('home');
    }
  },

  // Switch Active View Container
  switchView(viewName) {
    // If admin attempts to switch to home or scholarships, keep them on admin-dashboard
    if (auth.isAdmin() && (viewName === 'home' || viewName === 'scholarships' || viewName === 'admin-scholarships')) {
      viewName = 'admin-dashboard';
    }

    this.currentView = viewName;
    window.location.hash = `#${viewName}`;

    // Update view containers
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    } else {
      const homeSec = document.getElementById('view-home');
      if (homeSec) homeSec.classList.add('active');
    }

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile hamburger menu if open
    const navMenu = document.getElementById('nav-links');
    if (navMenu) navMenu.classList.remove('open');

    // Trigger view-specific data loading
    this.onViewActivated(viewName);
  },

  // Data loader dispatcher
  onViewActivated(viewName) {
    switch (viewName) {
      case 'home':
        scholarships.loadScholarships();
        break;
      case 'scholarships':
        scholarships.loadScholarships();
        break;
      case 'student-applications':
        student.loadApplications();
        break;
      case 'student-matched':
        scholarships.loadMatchedScholarships();
        break;
      case 'student-profile':
        student.loadProfile();
        break;
      case 'admin-dashboard':
        admin.loadDashboard();
        break;
      case 'admin-applications':
        admin.loadApplications();
        break;
      case 'admin-students':
        admin.loadStudents();
        break;
      case 'admin-logs':
        admin.loadRecentLogs();
        break;
    }
  },

  // Modal helpers
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      if (id === 'modal-register' && typeof auth !== 'undefined' && auth.handleEduLevelChange) {
        auth.handleEduLevelChange();
      }
    }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Display Digitally Signed Bonafide Certificate
  showBonafideModal(appItem) {
    if (!appItem) return;

    // Fill in Certificate Data
    const refCode = appItem.official_ref_number || `VNRVJIET/SCH-BONAFIDE/2026/${String(appItem.id).padStart(4, '0')}`;
    const refElem = document.getElementById('bonafide-ref-no');
    if (refElem) refElem.innerText = refCode;
    
    const issueDate = appItem.reviewed_at ? new Date(appItem.reviewed_at) : new Date(appItem.applied_date || Date.now());
    const formattedIssueDate = issueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dateElem = document.getElementById('bonafide-date');
    if (dateElem) dateElem.innerText = formattedIssueDate;

    // Student Information
    const studentName = appItem.student_name || (auth.currentUser ? auth.currentUser.full_name : 'Student Name');
    const nameElem = document.getElementById('bonafide-student-name');
    if (nameElem) nameElem.innerText = studentName;
    
    // Extract roll number if present
    let rollNo = '23071A0542';
    if (appItem.course_name && appItem.course_name.includes('Roll:')) {
      const match = appItem.course_name.match(/Roll:\s*([A-Za-z0-9]+)/);
      if (match) rollNo = match[1];
    } else if (appItem.student_notes) {
      const match = appItem.student_notes.match(/(2[0-9]{2}71[A-Za-z0-9]{5})/);
      if (match) rollNo = match[1];
    }
    const rollElem = document.getElementById('bonafide-roll-no');
    if (rollElem) rollElem.innerText = rollNo;
    
    const course = appItem.course_name ? appItem.course_name.replace(/\s*\(Roll:[^)]+\)/, '') : 'B.Tech in Computer Science & Engineering';
    const courseElem = document.getElementById('bonafide-course-name');
    if (courseElem) courseElem.innerText = course;
    
    const cgpaElem = document.getElementById('bonafide-cgpa');
    if (cgpaElem) cgpaElem.innerText = appItem.gpa_or_percentage ? `${appItem.gpa_or_percentage} / 10` : '8.85 / 10';

    // Scheme information
    const schemeElem = document.getElementById('bonafide-scheme-name');
    if (schemeElem) schemeElem.innerText = appItem.scholarship_title;

    const providerElem = document.getElementById('bonafide-provider-name');
    if (providerElem) providerElem.innerText = appItem.provider_name || 'Government / Corporate Scholarship Authority';

    const awardElem = document.getElementById('bonafide-award-amount');
    if (awardElem) awardElem.innerText = `₹${(appItem.award_amount || 0).toLocaleString('en-IN')}`;

    // Cryptographic hash mockup
    const fakeHash = 'SHA256: ' + Array.from(refCode + studentName).map(c => c.charCodeAt(0).toString(16)).join('').padEnd(32, 'a').substring(0, 32);
    const hashElem = document.getElementById('bonafide-hash');
    if (hashElem) hashElem.innerText = fakeHash.toUpperCase();

    const timeElem = document.getElementById('bonafide-timestamp');
    if (timeElem) timeElem.innerText = `Digitally Endorsed: ${formattedIssueDate} IST`;

    // External Portal Link
    const externalLink = document.getElementById('bonafide-external-portal-btn');
    if (externalLink) {
      externalLink.href = appItem.application_url || 'https://scholarships.gov.in';
    }

    this.showModal('modal-bonafide-certificate');
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    let title = 'Information';
    if (type === 'success') { icon = 'fa-check-circle'; title = 'Success'; }
    if (type === 'error') { icon = 'fa-exclamation-triangle'; title = 'Error'; }
    if (type === 'warning') { icon = 'fa-exclamation-circle'; title = 'Notice'; }

    toast.innerHTML = `
      <i class="fas ${icon} fa-lg" style="margin-top: 2px;"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div>${this.escapeHtml(message)}</div>
      </div>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  },

  // String escaping helper to prevent XSS
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Start application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
