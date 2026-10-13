/**
 * ScholarHub Administrator Dashboard & Operations Controller
 */

const admin = {
  editingScholarshipId: null,
  reviewingAppId: null,

  // Load Admin Dashboard Stats & Pending Operational Queue
  async loadDashboard() {
    try {
      const statsRes = await api.get('/admin/stats');
      if (statsRes.success) {
        const s = statsRes.stats;
        const studentEl = document.getElementById('admin-stat-students');
        if (studentEl) studentEl.innerText = s.total_students;

        const pendingEl = document.getElementById('admin-stat-pending');
        if (pendingEl) pendingEl.innerText = s.pending_reviews;

        const disbursedEl = document.getElementById('admin-stat-disbursed');
        if (disbursedEl) disbursedEl.innerText = `₹${(s.total_disbursed || 0).toLocaleString('en-IN')}`;
      }

      this.loadDashboardPending();
    } catch (err) {
      app.showToast('Failed to load admin stats: ' + err.message, 'error');
    }
  },

  // Load actionable pending applications right on the dashboard
  async loadDashboardPending() {
    const container = document.getElementById('admin-dashboard-pending-list');
    if (!container) return;

    try {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Checking pending submissions...</div>`;

      const res = await api.get('/applications');
      if (res.success) {
        const pending = res.applications.filter(a => a.status === 'submitted' || a.status === 'under_review');
        if (pending.length === 0) {
          container.innerHTML = `
            <div style="text-align: center; padding: 2.25rem 1rem; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-sm);">
              <i class="fas fa-check-circle fa-2x" style="color: var(--success); margin-bottom: 0.5rem; display: block;"></i>
              <strong style="color: var(--secondary); font-size: 0.95rem;">All Caught Up!</strong>
              <p style="font-size: 0.85rem; margin-top: 0.25rem;">No student applications are currently awaiting decision.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div class="table-responsive" style="margin-bottom: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Scholarship Scheme</th>
                  <th>Student Score & Income</th>
                  <th>Status</th>
                  <th style="text-align: right;">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pending.map(a => `
                  <tr>
                    <td>
                      <strong>${app.escapeHtml(a.student_name)}</strong>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">${app.escapeHtml(a.student_email)}</div>
                      <div style="font-size: 0.75rem; color: var(--text-light);">${app.escapeHtml(a.institution_name || '')}</div>
                    </td>
                    <td>
                      <strong>${app.escapeHtml(a.scholarship_title)}</strong>
                      <div style="font-weight: 700; color: var(--success); font-size: 0.85rem;">₹${a.award_amount.toLocaleString('en-IN')}</div>
                    </td>
                    <td>
                      <div>CGPA / %: <strong>${a.gpa_or_percentage || 'N/A'}</strong></div>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">Family Income: ₹${(a.family_annual_income || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td>
                      <span class="badge badge-${a.status}">${a.status.replace('_', ' ')}</span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn btn-success btn-sm" onclick="admin.quickApprove(${a.id}, '${app.escapeHtml(a.student_name)}')" title="Permit & Issue Digitally Signed Bonafide">
                        <i class="fas fa-file-signature"></i> Permit & Sign
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="admin.quickReject(${a.id}, '${app.escapeHtml(a.student_name)}')" title="Reject Application">
                        <i class="fas fa-times"></i> Reject
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="admin.openReviewModal(${JSON.stringify(a).replace(/"/g, '&quot;')})" title="View Details">
                        <i class="fas fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); padding: 1rem;">Failed to load pending queue: ${err.message}</p>`;
    }
  },

  // 1-Click Permit & Issue Bonafide
  async quickApprove(appId, studentName = '') {
    const label = studentName ? `for ${studentName}` : `#${appId}`;
    if (!confirm(`Are you sure you want to permit ${label} to apply externally and issue their Digitally Signed Bonafide Certificate?`)) {
      return;
    }

    try {
      const res = await api.patch(`/applications/${appId}/status`, {
        status: 'awarded',
        admin_feedback: 'Institutional clearance granted by VNRVJIET Scholarship Cell. Digitally signed Bonafide Certificate issued to student.'
      });

      if (res.success) {
        app.showToast(`Permission granted! Digitally signed Bonafide issued for student #${appId}.`, 'success');
        this.loadDashboard();
        this.loadApplications();
      }
    } catch (err) {
      app.showToast('Failed to issue bonafide: ' + err.message, 'error');
    }
  },

  // 1-Click Quick Reject
  async quickReject(appId, studentName = '') {
    const label = studentName ? `for ${studentName}` : `#${appId}`;
    const reason = prompt(`Enter reason for withholding clearance ${label} (optional):`, 'Not meeting academic attendance criteria');
    if (reason === null) return; // User pressed Cancel

    try {
      const res = await api.patch(`/applications/${appId}/status`, {
        status: 'rejected',
        admin_feedback: reason || 'Clearance withheld by VNRVJIET Scholarship Cell.'
      });

      if (res.success) {
        app.showToast(`Application #${appId} marked as rejected.`, 'info');
        this.loadDashboard();
        this.loadApplications();
      }
    } catch (err) {
      app.showToast('Failed to reject application: ' + err.message, 'error');
    }
  },

  // ------------------------------------------------------------------
  // SCHOLARSHIPS MANAGEMENT
  // ------------------------------------------------------------------
  async loadScholarships() {
    const tableBody = document.getElementById('admin-scholarships-table-body');
    if (!tableBody) return;

    try {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading scholarships...</td></tr>`;

      const res = await api.get('/scholarships?status=all');
      if (res.success) {
        if (res.scholarships.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No scholarships in the database.</td></tr>`;
          return;
        }

        tableBody.innerHTML = res.scholarships.map(s => `
          <tr>
            <td><strong>#${s.id}</strong></td>
            <td>
              <strong>${app.escapeHtml(s.title)}</strong>
              <div style="font-size:0.8rem; color:var(--text-muted);">${app.escapeHtml(s.provider_name)}</div>
            </td>
            <td><span class="card-category">${app.escapeHtml(s.category)}</span></td>
            <td><strong style="color:var(--success-dark);">₹${s.award_amount.toLocaleString('en-IN')}</strong></td>
            <td>${s.deadline}</td>
            <td>
              <span class="badge badge-${s.status}">${s.status}</span>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${s.total_applicants || 0} applicants</div>
            </td>
            <td style="white-space:nowrap;">
              <button class="btn btn-secondary btn-sm" onclick="admin.openScholarshipModal(${s.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-danger btn-sm" onclick="admin.deleteScholarship(${s.id}, '${app.escapeHtml(s.title)}')">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" style="color:var(--danger); text-align:center;">${err.message}</td></tr>`;
    }
  },

  // Open Add/Edit Scholarship Modal
  async openScholarshipModal(id = null) {
    this.editingScholarshipId = id;
    const modalTitle = document.getElementById('modal-scholarship-title');
    const form = document.getElementById('form-scholarship');

    form.reset();

    if (id) {
      modalTitle.innerText = 'Edit Scholarship Scheme';
      try {
        const res = await api.get(`/scholarships/${id}`);
        if (res.success) {
          const s = res.scholarship;
          document.getElementById('sch-form-title').value = s.title;
          document.getElementById('sch-form-provider').value = s.provider_name;
          document.getElementById('sch-form-category').value = s.category;
          document.getElementById('sch-form-award').value = s.award_amount;
          document.getElementById('sch-form-deadline').value = s.deadline ? s.deadline.substring(0, 10) : '';
          document.getElementById('sch-form-education').value = s.education_level;
          document.getElementById('sch-form-gpa').value = s.min_gpa;
          document.getElementById('sch-form-income').value = s.max_income;
          document.getElementById('sch-form-slots').value = s.slots_available;
          document.getElementById('sch-form-status').value = s.status;
          document.getElementById('sch-form-url').value = s.application_url || '';
          document.getElementById('sch-form-desc').value = s.description;
        }
      } catch (err) {
        app.showToast('Failed to load scholarship: ' + err.message, 'error');
        return;
      }
    } else {
      modalTitle.innerText = 'Add New Scholarship Scheme';
      document.getElementById('sch-form-status').value = 'active';
      document.getElementById('sch-form-education').value = 'All';
      document.getElementById('sch-form-slots').value = '10';
    }

    app.showModal('modal-manage-scholarship');
  },

  // Save Scholarship (Create or Update)
  async saveScholarship(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-scholarship');

    const payload = {
      title: document.getElementById('sch-form-title').value.trim(),
      provider_name: document.getElementById('sch-form-provider').value.trim(),
      category: document.getElementById('sch-form-category').value,
      award_amount: document.getElementById('sch-form-award').value,
      deadline: document.getElementById('sch-form-deadline').value,
      education_level: document.getElementById('sch-form-education').value,
      min_gpa: document.getElementById('sch-form-gpa').value,
      max_income: document.getElementById('sch-form-income').value,
      slots_available: document.getElementById('sch-form-slots').value,
      status: document.getElementById('sch-form-status').value,
      application_url: document.getElementById('sch-form-url').value.trim(),
      description: document.getElementById('sch-form-desc').value.trim()
    };

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      let res;
      if (this.editingScholarshipId) {
        res = await api.put(`/scholarships/${this.editingScholarshipId}`, payload);
      } else {
        res = await api.post('/scholarships', payload);
      }

      if (res.success) {
        app.closeModal('modal-manage-scholarship');
        app.showToast(res.message, 'success');
        this.loadScholarships();
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Scholarship';
    }
  },

  // Delete Scholarship
  async deleteScholarship(id, title) {
    if (!confirm(`Are you sure you want to permanently delete "${title}" and all related student applications?`)) {
      return;
    }

    try {
      const res = await api.delete(`/scholarships/${id}`);
      if (res.success) {
        app.showToast(res.message, 'success');
        this.loadScholarships();
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ------------------------------------------------------------------
  // APPLICATIONS REVIEW
  // ------------------------------------------------------------------
  async loadApplications() {
    const tableBody = document.getElementById('admin-applications-table-body');
    if (!tableBody) return;

    const filterStatus = document.getElementById('admin-filter-app-status')?.value || 'all';

    try {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading applications...</td></tr>`;

      const res = await api.get(`/applications?status=${filterStatus}`);
      if (res.success) {
        this.applicationsList = res.applications || [];
        if (this.applicationsList.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No applications found matching filter.</td></tr>`;
          return;
        }

        tableBody.innerHTML = this.applicationsList.map(appItem => {
          const isPending = appItem.status === 'submitted' || appItem.status === 'under_review';
          return `
            <tr>
              <td><strong>#${appItem.id}</strong></td>
              <td>
                <strong>${app.escapeHtml(appItem.student_name)}</strong>
                <div style="font-size:0.8rem; color:var(--text-muted);">${app.escapeHtml(appItem.student_email)}</div>
                <div style="font-size:0.75rem; color:var(--text-light);">${app.escapeHtml(appItem.institution_name || '')}</div>
              </td>
              <td>
                <strong>${app.escapeHtml(appItem.scholarship_title)}</strong>
                <div style="font-weight:700; color:var(--success); font-size:0.85rem;">₹${appItem.award_amount.toLocaleString('en-IN')}</div>
              </td>
              <td>
                <div>CGPA: <strong>${appItem.gpa_or_percentage || 'N/A'}</strong></div>
                <div style="font-size:0.8rem; color:var(--text-muted);">Income: ₹${(appItem.family_annual_income || 0).toLocaleString('en-IN')}</div>
              </td>
              <td>${new Date(appItem.applied_date).toLocaleDateString('en-IN')}</td>
              <td>
                ${appItem.status === 'awarded' ? `
                  <span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700;">
                    <i class="fas fa-certificate"></i> Permitted
                  </span>
                ` : `
                  <span class="badge badge-${appItem.status}">${appItem.status.replace('_', ' ')}</span>
                `}
              </td>
              <td style="white-space:nowrap; text-align:right;">
                ${isPending ? `
                  <button class="btn btn-success btn-sm" onclick="admin.quickApprove(${appItem.id}, '${app.escapeHtml(appItem.student_name)}')" title="Permit & Issue Digitally Signed Bonafide">
                    <i class="fas fa-file-signature"></i> Permit & Sign
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="admin.quickReject(${appItem.id}, '${app.escapeHtml(appItem.student_name)}')" title="Reject">
                    <i class="fas fa-times"></i> Reject
                  </button>
                ` : ''}
                ${appItem.status === 'awarded' ? `
                  <button class="btn btn-primary btn-sm" onclick="app.showBonafideModal(${JSON.stringify(appItem).replace(/"/g, '&quot;')})" title="View Issued Bonafide">
                    <i class="fas fa-certificate"></i> View Bonafide
                  </button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="admin.openReviewModal(${JSON.stringify(appItem).replace(/"/g, '&quot;')})" title="View Details">
                  <i class="fas fa-eye"></i> Details
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" style="color:var(--danger); text-align:center;">${err.message}</td></tr>`;
    }
  },

  // Export clearance applications to CSV
  exportApplicationsCSV() {
    if (!this.applicationsList || this.applicationsList.length === 0) {
      app.showToast('No clearance records available to export.', 'warning');
      return;
    }

    const headers = ['Application ID', 'Student Name', 'Student Email', 'Phone', 'Institution', 'Course', 'External Scheme', 'Provider', 'Award Amount (INR)', 'CGPA', 'Family Annual Income (INR)', 'Requested Date', 'Status', 'Ref Code', 'Reviewed By'];
    
    const rows = this.applicationsList.map(a => [
      a.id,
      `"${(a.student_name || '').replace(/"/g, '""')}"`,
      `"${(a.student_email || '').replace(/"/g, '""')}"`,
      `"${(a.student_phone || '').replace(/"/g, '""')}"`,
      `"${(a.institution_name || '').replace(/"/g, '""')}"`,
      `"${(a.course_name || '').replace(/"/g, '""')}"`,
      `"${(a.scholarship_title || '').replace(/"/g, '""')}"`,
      `"${(a.provider_name || '').replace(/"/g, '""')}"`,
      a.award_amount || 0,
      a.gpa_or_percentage || '',
      a.family_annual_income || 0,
      `"${(a.applied_date || '').substring(0, 10)}"`,
      `"${a.status || ''}"`,
      `"${(a.official_ref_number || '').replace(/"/g, '""')}"`,
      `"${(a.reviewer_name || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VNRVJIET_Clearance_Applications_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    app.showToast('Clearance records exported to CSV successfully!', 'success');
  },

  // Open review modal
  openReviewModal(appItem) {
    this.reviewingAppId = appItem.id;

    document.getElementById('review-app-id').innerText = `#${appItem.id}`;
    document.getElementById('review-student-name').innerText = appItem.student_name;
    document.getElementById('review-student-details').innerText = `${appItem.student_email} • ${appItem.student_phone || 'No phone'}`;
    document.getElementById('review-student-academics').innerText = `${appItem.institution_name || 'N/A'} • ${appItem.course_name || 'N/A'} • CGPA: ${appItem.gpa_or_percentage} • Income: ₹${appItem.family_annual_income.toLocaleString('en-IN')}`;
    document.getElementById('review-scholarship-title').innerText = `${appItem.scholarship_title} (₹${appItem.award_amount.toLocaleString('en-IN')})`;
    document.getElementById('review-student-notes').innerText = appItem.student_notes || 'No notes submitted.';

    document.getElementById('review-status-select').value = appItem.status;
    document.getElementById('review-feedback-input').value = appItem.admin_feedback || '';

    app.showModal('modal-review-application');
  },

  // Submit Application Review
  async submitReview(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-review');
    const status = document.getElementById('review-status-select').value;
    const admin_feedback = document.getElementById('review-feedback-input').value.trim();

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      const res = await api.patch(`/applications/${this.reviewingAppId}/status`, {
        status,
        admin_feedback
      });

      if (res.success) {
        app.closeModal('modal-review-application');
        app.showToast(res.message, 'success');
        this.loadApplications();
        if (document.getElementById('admin-dashboard-pending-list')) {
          this.loadDashboard();
        }
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Decision';
    }
  },

  // ------------------------------------------------------------------
  // STUDENTS DIRECTORY
  // ------------------------------------------------------------------
  studentsList: [],

  async loadStudents() {
    const tableBody = document.getElementById('admin-students-table-body');
    if (!tableBody) return;

    try {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading registered students...</td></tr>`;

      const res = await api.get('/admin/students');
      if (res.success) {
        this.studentsList = res.students || [];
        this.filterStudents();
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" style="color:var(--danger); text-align:center;">${err.message}</td></tr>`;
    }
  },

  // Real-time student directory filter
  filterStudents() {
    const tableBody = document.getElementById('admin-students-table-body');
    if (!tableBody) return;

    const query = document.getElementById('admin-student-search')?.value.trim().toLowerCase() || '';
    const statusFilter = document.getElementById('admin-student-filter-status')?.value || 'all';

    const filtered = (this.studentsList || []).filter(st => {
      // Verification status filter
      if (statusFilter === 'verified' && !st.is_verified) return false;
      if (statusFilter === 'unverified' && !!st.is_verified) return false;

      // Query filter
      if (query) {
        const name = (st.full_name || '').toLowerCase();
        const email = (st.email || '').toLowerCase();
        const phone = (st.phone || '').toLowerCase();
        const course = (st.course_name || '').toLowerCase();
        const inst = (st.institution_name || '').toLowerCase();
        const id = String(st.user_id || st.id);
        if (!name.includes(query) && !email.includes(query) && !phone.includes(query) && !course.includes(query) && !inst.includes(query) && !id.includes(query)) {
          return false;
        }
      }
      return true;
    });

    this.renderStudentsTable(filtered);
  },

  // Render students table rows
  renderStudentsTable(list) {
    const tableBody = document.getElementById('admin-students-table-body');
    if (!tableBody) return;

    if (!list || list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color:var(--text-muted);"><i class="fas fa-user-slash fa-2x" style="margin-bottom:0.5rem; display:block; color:var(--text-light);"></i>No students match your search or filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(st => {
      const studentUserId = st.user_id || st.id;
      const isVerified = !!st.is_verified;
      return `
        <tr>
          <td><strong>#${studentUserId}</strong></td>
          <td>
            <strong>${app.escapeHtml(st.full_name)}</strong>
            <div style="font-size:0.8rem; color:var(--text-muted);">${app.escapeHtml(st.email)}</div>
            <div style="font-size:0.75rem; color:var(--text-light);">${st.phone || 'No phone'}</div>
          </td>
          <td>
            <div>${app.escapeHtml(st.course_name || 'Degree not set')}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${app.escapeHtml(st.institution_name || 'Institution not set')}</div>
          </td>
          <td>
            <div>CGPA / %: <strong>${st.gpa_or_percentage || 0}</strong></div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Income: ₹${(st.family_annual_income || 0).toLocaleString('en-IN')}</div>
          </td>
          <td>
            <span class="badge ${isVerified ? 'badge-verified' : 'badge-under_review'}">
              <i class="fas ${isVerified ? 'fa-check' : 'fa-clock'}"></i> ${isVerified ? 'Verified' : 'Unverified'}
            </span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${st.applications_count || 0} applications</div>
          </td>
          <td>
            <button class="btn ${isVerified ? 'btn-secondary' : 'btn-success'} btn-sm" onclick="admin.toggleStudentVerification(${studentUserId}, ${!isVerified})">
              <i class="fas ${isVerified ? 'fa-user-times' : 'fa-user-check'}"></i> 
              ${isVerified ? 'Revoke' : 'Verify'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // Export student directory to CSV
  exportStudentsCSV() {
    if (!this.studentsList || this.studentsList.length === 0) {
      app.showToast('No students registered yet to export.', 'warning');
      return;
    }

    const headers = ['User ID', 'Full Name', 'Email', 'Phone', 'Degree / Course', 'Institution', 'CGPA / Percentage', 'Family Annual Income (INR)', 'Verification Status', 'Applications Count', 'Registered Date'];

    const rows = this.studentsList.map(st => [
      st.user_id || st.id,
      `"${(st.full_name || '').replace(/"/g, '""')}"`,
      `"${(st.email || '').replace(/"/g, '""')}"`,
      `"${(st.phone || '').replace(/"/g, '""')}"`,
      `"${(st.course_name || '').replace(/"/g, '""')}"`,
      `"${(st.institution_name || '').replace(/"/g, '""')}"`,
      st.gpa_or_percentage || 0,
      st.family_annual_income || 0,
      st.is_verified ? 'Verified' : 'Unverified',
      st.applications_count || 0,
      `"${(st.created_at || '').substring(0, 10)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VNRVJIET_Students_Directory_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    app.showToast('Student directory exported to CSV successfully!', 'success');
  },

  // Toggle student verification status
  async toggleStudentVerification(userId, newStatus) {
    try {
      const res = await api.patch(`/admin/students/${userId}/verify`, { is_verified: newStatus });
      if (res.success) {
        app.showToast(res.message, 'success');
        await this.loadStudents();
        if (typeof this.loadDashboard === 'function') {
          await this.loadDashboard();
        }
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // ------------------------------------------------------------------
  // AUDIT LOGS
  // ------------------------------------------------------------------
  async loadRecentLogs() {
    const list = document.getElementById('admin-audit-logs-list');
    const fullList = document.getElementById('admin-audit-logs-full');
    if (!list && !fullList) return;

    try {
      const res = await api.get('/admin/activity-logs?limit=30');
      if (res.success) {
        const renderItems = (logs) => {
          if (!logs || logs.length === 0) {
            return `<li style="padding:0.75rem; color:var(--text-muted);">No logs available.</li>`;
          }
          return logs.map(log => `
            <li style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
              <div>
                <span style="font-size: 0.75rem; font-weight: 700; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: var(--secondary);">${log.action}</span>
                <p style="font-size: 0.88rem; color: var(--text-main); margin-top: 0.25rem;">${app.escapeHtml(log.details)}</p>
                <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fas fa-user"></i> ${app.escapeHtml(log.full_name)} (${log.role})</span>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-light); white-space: nowrap;">${log.created_at}</span>
            </li>
          `).join('');
        };

        if (list) list.innerHTML = renderItems(res.logs.slice(0, 10));
        if (fullList) fullList.innerHTML = renderItems(res.logs);
      }
    } catch (err) {
      if (list) list.innerHTML = `<li style="color:var(--danger);">${err.message}</li>`;
      if (fullList) fullList.innerHTML = `<li style="color:var(--danger);">${err.message}</li>`;
    }
  }
};
