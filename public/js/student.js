/**
 * ScholarHub Student Dashboard, Applications Tracker & Profile Module
 */

const student = {
  profileData: null,
  applicationsList: [],
  statusFilter: 'all',

  // Load student applications & metrics
  async loadApplications(resetFilter = false) {
    const listContainer = document.getElementById('student-applications-list');
    if (!listContainer) return;

    if (resetFilter) {
      this.statusFilter = 'all';
      const searchInput = document.getElementById('student-app-search');
      if (searchInput) searchInput.value = '';
      const group = document.getElementById('student-apps-pill-group');
      if (group) {
        group.querySelectorAll('.pill-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-status') === 'all');
        });
      }
    }

    try {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
          <p style="margin-top: 0.5rem; color: var(--text-muted);">Loading your applications...</p>
        </div>
      `;

      const res = await api.get('/applications/my');
      if (res.success) {
        // Update metric cards
        const stats = res.stats;
        document.getElementById('stat-student-total').innerText = stats.total;
        document.getElementById('stat-student-submitted').innerText = stats.submitted;
        document.getElementById('stat-student-review').innerText = stats.under_review;
        document.getElementById('stat-student-awarded').innerText = stats.awarded;

        this.applicationsList = res.applications || [];
        this.filterApplications();
      }
    } catch (err) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Failed to load applications: ${app.escapeHtml(err.message)}
        </div>
      `;
    }
  },

  // Set status filter from pills
  setAppStatusFilter(status, elem) {
    this.statusFilter = status;
    const group = document.getElementById('student-apps-pill-group');
    if (group) {
      group.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    }
    if (elem) elem.classList.add('active');
    this.filterApplications();
  },

  // Real-time filter applications
  filterApplications() {
    const listContainer = document.getElementById('student-applications-list');
    if (!listContainer) return;

    const query = document.getElementById('student-app-search')?.value.trim().toLowerCase() || '';

    const filtered = (this.applicationsList || []).filter(item => {
      // Status check
      if (this.statusFilter !== 'all') {
        if (item.status !== this.statusFilter) return false;
      }

      // Query check
      if (query) {
        const title = (item.scholarship_title || '').toLowerCase();
        const provider = (item.provider_name || '').toLowerCase();
        const ref = (item.official_ref_number || '').toLowerCase();
        const cat = (item.scholarship_category || '').toLowerCase();
        if (!title.includes(query) && !provider.includes(query) && !ref.includes(query) && !cat.includes(query)) {
          return false;
        }
      }
      return true;
    });

    this.renderApplications(listContainer, filtered);
  },

  // Render applications list with interactive status stepper
  renderApplications(container, list) {
    if (!list || list.length === 0) {
      if (this.applicationsList && this.applicationsList.length > 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
            <i class="fas fa-filter fa-2x" style="color: var(--text-light); margin-bottom: 0.75rem;"></i>
            <h3 style="color: var(--secondary);">No requests match your search or filter</h3>
            <p style="color: var(--text-muted); margin: 0.35rem 0 1rem 0;">Try clearing the search term or switching to the "All" status filter.</p>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('student-app-search').value=''; student.setAppStatusFilter('all', document.querySelector('#student-apps-pill-group .pill-btn'));">
              Reset Filters
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
          <i class="fas fa-clipboard-list fa-3x" style="color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3 style="color: var(--secondary);">You haven't applied to any scholarships yet</h3>
          <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Explore open grants and submit your application to track its review process here.</p>
          <button class="btn btn-primary" onclick="app.switchView('scholarships')">
            <i class="fas fa-search"></i> Browse Opportunities
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(appItem => {
      const isRejected = appItem.status === 'rejected';
      const isAwarded = appItem.status === 'awarded';

      // Status stepper step state
      const steps = [
        { key: 'submitted', label: 'Requested' },
        { key: 'under_review', label: 'Verification' },
        { key: 'verified', label: 'Endorsed' },
        { key: 'awarded', label: isRejected ? 'Rejected' : 'Bonafide Issued' }
      ];

      const getStepClass = (stepKey, currentStatus) => {
        const order = ['submitted', 'under_review', 'verified', 'awarded'];
        const currentIndex = isRejected ? 3 : order.indexOf(currentStatus);
        const thisIndex = order.indexOf(stepKey);

        if (isRejected && stepKey === 'awarded') {
          return 'active step-rejected';
        }
        if (thisIndex < currentIndex) return 'completed';
        if (thisIndex === currentIndex) return 'active';
        return '';
      };

      return `
        <div style="background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.35rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); overflow: hidden; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                <span class="card-category-tag">${app.escapeHtml(appItem.scholarship_category)}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Ref: <strong>${app.escapeHtml(appItem.official_ref_number || 'N/A')}</strong></span>
              </div>
              <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.25rem;">${app.escapeHtml(appItem.scholarship_title)}</h3>
              <p style="color: var(--text-muted); font-size: 0.86rem;"><i class="fas fa-university"></i> External Provider: ${app.escapeHtml(appItem.provider_name)}</p>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span class="card-award-amount" style="display: block;">₹${appItem.award_amount.toLocaleString('en-IN')}</span>
              ${isAwarded ? `
                <span class="badge" style="margin-top: 0.35rem; background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 700;">
                  <i class="fas fa-certificate"></i> Permitted (Bonafide Issued)
                </span>
              ` : `
                <span class="badge badge-${appItem.status}" style="margin-top: 0.35rem;">
                  <i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${appItem.status.replace('_', ' ')}
                </span>
              `}
            </div>
          </div>

          <!-- Stepper Pipeline -->
          <div class="status-tracker">
            ${steps.map((st, idx) => `
              <div class="step-item ${getStepClass(st.key, appItem.status)}">
                <div class="step-circle">${idx + 1}</div>
                <span class="step-label">${st.label}</span>
              </div>
            `).join('')}
          </div>

          <!-- Application remarks & Admin Feedback -->
          <div style="background: #f8fafc; border-radius: var(--radius-sm); padding: 0.85rem 1rem; font-size: 0.88rem; margin-top: 0.85rem; border: 1px solid var(--border-color); overflow: hidden;">
            <div style="margin-bottom: 0.4rem;">
              <span style="color: var(--text-muted); font-weight: 600;">Your Request Details:</span>
              <p style="color: var(--text-main); margin-top: 0.15rem; word-break: break-word;">${app.escapeHtml(appItem.student_notes || 'None provided.')}</p>
            </div>
            ${appItem.admin_feedback ? `
              <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); color: #1e3a8a;">
                <span style="font-weight: 700;"><i class="fas fa-comment-dots"></i> VNRVJIET Scholarship Cell Remarks:</span>
                <p style="margin-top: 0.15rem; font-style: italic; word-break: break-word;">"${app.escapeHtml(appItem.admin_feedback)}"</p>
              </div>
            ` : `
              <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-light); font-style: italic;">
                Clearance request under review by VNRVJIET Scholarship & Academic Section.
              </div>
            `}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.95rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; gap: 0.65rem;">
            <span><i class="far fa-calendar-alt"></i> Requested: ${new Date(appItem.applied_date).toLocaleDateString('en-IN')}</span>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              ${isAwarded ? `
                <button class="btn btn-primary btn-sm" onclick="app.showBonafideModal(${JSON.stringify(appItem).replace(/"/g, '&quot;')})">
                  <i class="fas fa-file-signature"></i> Download / View Digitally Signed Bonafide
                </button>
                ${appItem.application_url ? `
                  <a href="${appItem.application_url}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm">
                    <i class="fas fa-external-link-alt"></i> Apply on External Portal
                  </a>
                ` : ''}
              ` : `
                ${appItem.application_url ? `
                  <a href="${appItem.application_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                    <i class="fas fa-external-link-alt"></i> External Scheme Portal
                  </a>
                ` : ''}
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Dynamic branch options handler for Student Profile
  handleEduLevelChange(selectedBranch = '') {
    const levelSelect = document.getElementById('prof-edu-level');
    const courseSelect = document.getElementById('prof-course');
    if (!levelSelect || !courseSelect) return;

    const level = levelSelect.value === 'Postgraduate' ? 'Postgraduate' : 'Undergraduate';
    const branches = (auth && auth.branchesConfig && auth.branchesConfig[level]) ? auth.branchesConfig[level] : [];

    courseSelect.innerHTML = '<option value="">Select Branch</option>';
    let matched = false;
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      if (selectedBranch && b === selectedBranch) {
        opt.selected = true;
        matched = true;
      }
      courseSelect.appendChild(opt);
    });

    if (!matched && selectedBranch) {
      const lower = selectedBranch.toLowerCase();
      for (let i = 0; i < courseSelect.options.length; i++) {
        const optVal = courseSelect.options[i].value.toLowerCase();
        if (
          (lower.includes('aiml') || lower.includes('machine learning')) && optVal.includes('machine learning') ||
          (lower.includes('data science') || lower.includes('csd')) && optVal.includes('data science') ||
          (lower.includes('cyber') || lower.includes('csc')) && optVal.includes('cyber') ||
          (lower.includes('csbs') || lower.includes('business')) && optVal.includes('business') ||
          (lower.includes('it') || lower.includes('information technology')) && optVal.includes('information technology') ||
          (lower.includes('ece') || lower.includes('communication')) && optVal.includes('communication') ||
          (lower.includes('eee') || lower.includes('electrical')) && optVal.includes('electrical') ||
          (lower.includes('eie') || lower.includes('instrumentation')) && optVal.includes('instrumentation') ||
          (lower.includes('mech') || lower.includes('mechanical')) && optVal.includes('mechanical') ||
          (lower.includes('civil')) && optVal.includes('civil') ||
          (lower.includes('auto') || lower.includes('automobile')) && optVal.includes('automobile') ||
          (lower.includes('vlsi')) && optVal.includes('vlsi') ||
          (lower.includes('structural')) && optVal.includes('structural') ||
          (lower.includes('embedded')) && optVal.includes('embedded') ||
          (lower.includes('cse') || lower.includes('computer science')) && optVal.includes('cse')
        ) {
          courseSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && selectedBranch) {
        const customOpt = new Option(selectedBranch, selectedBranch, true, true);
        courseSelect.add(customOpt);
      }
    }
  },

  // Load student profile for editing
  async loadProfile() {
    try {
      const res = await api.get('/auth/profile');
      if (res.success && res.profile) {
        this.profileData = res.profile;

        const headingEl = document.getElementById('student-profile-heading');
        if (headingEl && res.profile.full_name) {
          headingEl.innerText = `Student ${res.profile.full_name}`;
        }

        document.getElementById('prof-fullname').value = res.profile.full_name || '';
        document.getElementById('prof-email').value = res.profile.email || '';
        document.getElementById('prof-phone').value = res.profile.phone || '';
        document.getElementById('prof-dob').value = res.profile.date_of_birth ? res.profile.date_of_birth.substring(0, 10) : '';
        document.getElementById('prof-gender').value = res.profile.gender || 'Prefer not to say';
        document.getElementById('prof-category').value = res.profile.category || 'General';
        document.getElementById('prof-income').value = res.profile.family_annual_income || 0;
        
        const eduLevel = res.profile.education_level === 'Postgraduate' ? 'Postgraduate' : 'Undergraduate';
        document.getElementById('prof-edu-level').value = eduLevel;

        // Populate branches for this education level and select student branch
        const rawCourse = (res.profile.course_name || '').trim();
        this.handleEduLevelChange(rawCourse);

        document.getElementById('prof-institution').value = 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad';
        document.getElementById('prof-gpa').value = res.profile.gpa_or_percentage || 0;
        document.getElementById('prof-state').value = res.profile.state || '';
        document.getElementById('prof-address').value = res.profile.address || '';

        // Verification banner
        const verifyBanner = document.getElementById('profile-verification-status');
        if (verifyBanner) {
          if (res.profile.is_verified) {
            verifyBanner.innerHTML = `
              <div style="background-color: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.5rem;">
                <i class="fas fa-badge-check fa-lg" style="color: #10b981;"></i>
                <div>
                  <strong>Verified Student Profile</strong>
                  <div style="font-size: 0.82rem;">Your credentials and academic standing have been verified by the administration.</div>
                </div>
              </div>
            `;
          } else {
            verifyBanner.innerHTML = `
              <div style="background-color: #fffbeb; border: 1px solid #f59e0b; color: #92400e; padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.5rem;">
                <i class="fas fa-clock fa-lg" style="color: #f59e0b;"></i>
                <div>
                  <strong>Verification Pending</strong>
                  <div style="font-size: 0.82rem;">Your profile is undergoing administrative record verification. You can still apply for scholarships.</div>
                </div>
              </div>
            `;
          }
        }
      }
    } catch (err) {
      app.showToast('Failed to load profile: ' + err.message, 'error');
    }
  },

  // Save student profile
  async saveProfile(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-profile');

    const payload = {
      phone: document.getElementById('prof-phone').value.trim(),
      date_of_birth: document.getElementById('prof-dob').value || null,
      gender: document.getElementById('prof-gender').value,
      category: document.getElementById('prof-category').value,
      family_annual_income: document.getElementById('prof-income').value,
      education_level: document.getElementById('prof-edu-level').value,
      course_name: document.getElementById('prof-course').value.trim(),
      institution_name: 'VNR Vignana Jyothi Institute of Engineering and Technology, Hyderabad',
      gpa_or_percentage: document.getElementById('prof-gpa').value,
      state: document.getElementById('prof-state').value.trim(),
      address: document.getElementById('prof-address').value.trim()
    };

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Profile...';

      const res = await api.put('/auth/profile', payload);
      if (res.success) {
        app.showToast('Profile updated successfully!', 'success');
        this.profileData = res.profile;
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Profile Details';
    }
  }
};
