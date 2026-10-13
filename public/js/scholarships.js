/**
 * ScholarHub Scholarships Browser, Filtering & Details Module
 */

const scholarships = {
  currentList: [],
  selectedScholarship: null,

  activeTab: 'all', // 'all' or 'saved'

  // Bookmarking helpers
  getBookmarks() {
    try {
      const user = api.getUser();
      const key = user ? `scholarhub_bookmarks_${user.id}` : 'scholarhub_bookmarks_guest';
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  },

  isBookmarked(id) {
    return this.getBookmarks().includes(Number(id));
  },

  toggleBookmark(id, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const user = api.getUser();
    const key = user ? `scholarhub_bookmarks_${user.id}` : 'scholarhub_bookmarks_guest';
    let marks = this.getBookmarks();
    const numId = Number(id);
    const exists = marks.includes(numId);
    if (exists) {
      marks = marks.filter(m => m !== numId);
      app.showToast('Removed from Saved Schemes', 'info');
    } else {
      marks.push(numId);
      app.showToast('Scheme saved to bookmarks!', 'success');
    }
    localStorage.setItem(key, JSON.stringify(marks));
    this.updateBookmarkBadge();
    this.applyTabFilter();
  },

  updateBookmarkBadge() {
    const count = this.getBookmarks().length;
    const badge = document.getElementById('saved-schemes-badge');
    if (badge) badge.innerText = count;
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.getElementById('tab-sch-all')?.classList.toggle('active', tab === 'all');
    document.getElementById('tab-sch-saved')?.classList.toggle('active', tab === 'saved');
    this.applyTabFilter();
  },

  applyTabFilter() {
    const container = document.getElementById('scholarships-container');
    if (!container) return;
    let listToRender = this.currentList;
    if (this.activeTab === 'saved') {
      const bookmarkedIds = this.getBookmarks();
      listToRender = this.currentList.filter(item => bookmarkedIds.includes(Number(item.id)));
    }
    this.renderScholarshipGrid(container, listToRender);
    const countBadge = document.getElementById('scholarships-count');
    if (countBadge) {
      countBadge.innerText = this.activeTab === 'saved'
        ? `${listToRender.length} Saved Schemes`
        : `${this.currentList.length} Opportunities Available`;
    }
  },

  // Load scholarships with active filter controls
  async loadScholarships() {
    const container = document.getElementById('scholarships-container');
    if (!container) return;

    const search = document.getElementById('filter-search')?.value.trim() || '';
    const category = document.getElementById('filter-category')?.value || 'All';
    const education_level = document.getElementById('filter-education')?.value || 'All';
    const min_gpa = document.getElementById('filter-gpa')?.value || '';
    const max_income = document.getElementById('filter-income')?.value || '';

    try {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
          <p style="margin-top: 0.75rem; color: var(--text-muted);">Finding scholarships...</p>
        </div>
      `;

      let queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category && category !== 'All') queryParams.append('category', category);
      if (education_level && education_level !== 'All') queryParams.append('education_level', education_level);
      if (min_gpa) queryParams.append('min_gpa', min_gpa);
      if (max_income) queryParams.append('max_income', max_income);

      const res = await api.get(`/scholarships?${queryParams.toString()}`);
      if (res.success) {
        this.currentList = res.scholarships;
        this.updateBookmarkBadge();
        this.applyTabFilter();

        const homePreview = document.getElementById('home-scholarships-preview');
        if (homePreview) {
          this.renderScholarshipGrid(homePreview, this.currentList.slice(0, 3));
        }
      }
    } catch (err) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--danger);">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <p style="margin-top: 0.5rem;">Failed to load scholarships: ${app.escapeHtml(err.message)}</p>
        </div>
      `;
    }
  },

  // Reset filters
  resetFilters() {
    if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
    if (document.getElementById('filter-category')) document.getElementById('filter-category').value = 'All';
    if (document.getElementById('filter-education')) document.getElementById('filter-education').value = 'All';
    if (document.getElementById('filter-gpa')) document.getElementById('filter-gpa').value = '';
    if (document.getElementById('filter-income')) document.getElementById('filter-income').value = '';
    this.activeTab = 'all';
    document.getElementById('tab-sch-all')?.classList.add('active');
    document.getElementById('tab-sch-saved')?.classList.remove('active');
    this.loadScholarships();
  },

  // Render grid of cards
  renderScholarshipGrid(container, list) {
    if (!list || list.length === 0) {
      if (this.activeTab === 'saved') {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
            <i class="fas fa-bookmark fa-3x" style="color: var(--text-light); margin-bottom: 1rem;"></i>
            <h3 style="font-size: 1.25rem; color: var(--secondary);">No Saved Scholarships Yet</h3>
            <p style="color: var(--text-muted); margin-top: 0.35rem;">Click the bookmark icon on any scheme card to save it for quick review.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="scholarships.switchTab('all')">Browse All Schemes</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
          <i class="fas fa-folder-open fa-3x" style="color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.25rem; color: var(--secondary);">No scholarships match your filters</h3>
          <p style="color: var(--text-muted); margin-top: 0.35rem;">Try relaxing your search query or criteria to see more results.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="scholarships.resetFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const deadlineDate = new Date(item.deadline);
      const now = new Date();
      const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
      const isSaved = this.isBookmarked(item.id);

      let deadlinePill = '';
      if (diffDays < 0) {
        deadlinePill = `<span class="card-deadline-pill normal"><i class="fas fa-check-circle"></i> Closed</span>`;
      } else if (diffDays <= 7) {
        deadlinePill = `<span class="card-deadline-pill urgent"><i class="fas fa-fire"></i> ${diffDays} day${diffDays === 1 ? '' : 's'} left</span>`;
      } else if (diffDays <= 30) {
        deadlinePill = `<span class="card-deadline-pill soon"><i class="far fa-clock"></i> ${diffDays} days left</span>`;
      } else {
        const formattedDate = deadlineDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        deadlinePill = `<span class="card-deadline-pill normal"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>`;
      }

      const slotsPill = item.slots_available > 0 
        ? `<span class="card-slots-pill"><i class="fas fa-user-check"></i> ${item.slots_available} slots</span>` 
        : '';

      return `
        <div class="scholarship-card">
          <div>
            <div class="card-top">
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                <span class="card-category-tag">${app.escapeHtml(item.category)}</span>
                ${slotsPill}
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span class="card-award-amount">₹${item.award_amount.toLocaleString('en-IN')}</span>
                <button class="card-bookmark-btn ${isSaved ? 'saved' : ''}" onclick="scholarships.toggleBookmark(${item.id}, event)" title="${isSaved ? 'Remove from Saved' : 'Save for later'}">
                  <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                </button>
              </div>
            </div>
            <div style="font-size: 0.74rem; color: #2563eb; font-weight: 700; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.3rem;">
              <i class="fas fa-external-link-alt"></i> External Scheme • College Bonafide Required
            </div>
            <h3 class="card-title" title="${app.escapeHtml(item.title)}">${app.escapeHtml(item.title)}</h3>
            <p class="card-provider-text"><i class="fas fa-university"></i> ${app.escapeHtml(item.provider_name)}</p>

            <div class="card-criteria-box">
              <div class="criteria-item">
                <span class="label"><i class="fas fa-graduation-cap"></i> Target Level:</span>
                <span class="value">${app.escapeHtml(item.education_level)}</span>
              </div>
              <div class="criteria-item">
                <span class="label"><i class="fas fa-chart-line"></i> Academic Score:</span>
                <span class="value">${item.min_gpa > 0 ? item.min_gpa + ' CGPA / %' : 'Open to All'}</span>
              </div>
              <div class="criteria-item">
                <span class="label"><i class="fas fa-rupee-sign"></i> Max Annual Income:</span>
                <span class="value">${item.max_income > 0 ? '₹' + item.max_income.toLocaleString('en-IN') : 'No Upper Cap'}</span>
              </div>
            </div>
          </div>

          <div class="card-bottom-actions">
            ${deadlinePill}
            <button class="btn btn-primary btn-sm" onclick="scholarships.viewDetails(${item.id})">
              Details & Clearance <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // View scholarship details with eligibility checklist
  async viewDetails(id) {
    try {
      const res = await api.get(`/scholarships/${id}`);
      if (!res.success) throw new Error(res.message);

      const sch = res.scholarship;
      const elig = res.eligibilityAnalysis;
      const existingApp = res.existingApplication;
      this.selectedScholarship = sch;

      const modalTitle = document.getElementById('details-modal-title');
      const modalBody = document.getElementById('details-modal-body');
      const modalFooter = document.getElementById('details-modal-footer');

      modalTitle.innerText = sch.title;

      const deadlineDate = new Date(sch.deadline);
      const formattedDeadline = deadlineDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
      const daysLeft = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));

      // 1. Exact Eligibility Criteria Breakdown
      const academicText = sch.min_gpa > 0 
        ? `Minimum ${sch.min_gpa} CGPA (or ${(sch.min_gpa * 10).toFixed(0)}% aggregate)` 
        : 'Open to All (Passing marks in qualifying examination)';

      const incomeText = sch.max_income > 0 
        ? `Up to ₹${sch.max_income.toLocaleString('en-IN')} per annum (Gross Family Income)` 
        : 'No Upper Income Cap (Purely Merit-Based Scheme)';

      const educationText = sch.education_level === 'All' 
        ? 'All Educational Levels (School, Diploma, Undergraduate, Postgraduate)' 
        : `${sch.education_level} Degree / Course`;

      // 2. Student Compatibility Check (if logged in)
      let studentCheckSection = '';
      if (auth.isStudent() && elig) {
        studentCheckSection = `
          <div style="background-color: ${elig.isEligible ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${elig.isEligible ? '#86efac' : '#fde68a'}; border-radius: var(--radius-md); padding: 1.15rem; margin-top: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <strong style="color: ${elig.isEligible ? '#15803d' : '#b45309'}; font-size: 0.95rem;">
                <i class="fas ${elig.isEligible ? 'fa-check-circle' : 'fa-info-circle'}"></i> 
                ${elig.isEligible ? 'Your Profile Matches All Requirements!' : 'Your Profile Compatibility Match'}
              </strong>
              <span class="badge ${elig.isEligible ? 'badge-verified' : 'badge-under_review'}">
                ${elig.isEligible ? 'Eligible to Apply' : 'Check Criteria'}
              </span>
            </div>
            <ul style="list-style: none; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <li style="color: ${elig.meetsGpa ? '#15803d' : '#b91c1c'}; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${elig.meetsGpa ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                <span>Academic Score: <strong>${elig.studentGpa || 'Not set'}</strong> (Required: ${sch.min_gpa > 0 ? sch.min_gpa + ' CGPA' : 'None'})</span>
              </li>
              <li style="color: ${elig.meetsIncome ? '#15803d' : '#b91c1c'}; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${elig.meetsIncome ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                <span>Family Annual Income: <strong>₹${(elig.studentIncome || 0).toLocaleString('en-IN')}</strong> (Ceiling: ${sch.max_income > 0 ? '₹' + sch.max_income.toLocaleString('en-IN') : 'No Limit'})</span>
              </li>
              <li style="color: ${elig.meetsEducation ? '#15803d' : '#b91c1c'}; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${elig.meetsEducation ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                <span>Degree Level: <strong>${elig.studentEducation || 'Not set'}</strong> (Required: ${sch.education_level})</span>
              </li>
            </ul>
          </div>
        `;
      } else if (!auth.isAuthenticated()) {
        studentCheckSection = `
          <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-top: 1.25rem; font-size: 0.88rem; color: #1e40af; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <span><i class="fas fa-user-graduate"></i> Log in as a student to test auto-compatibility against your profile.</span>
            <button class="btn btn-primary btn-sm" onclick="app.closeModal('modal-details'); app.showModal('modal-login');">Log In</button>
          </div>
        `;
      }

      modalBody.innerHTML = `
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
          <div>
            <span class="card-category-tag" style="margin-bottom: 0.4rem;">${app.escapeHtml(sch.category)}</span>
            <div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.25rem;">
              <i class="fas fa-university" style="color: var(--primary);"></i> Sponsoring Authority: <strong>${app.escapeHtml(sch.provider_name)}</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">GRANT AMOUNT</div>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--success); line-height: 1.1;">₹${sch.award_amount.toLocaleString('en-IN')}</div>
            </div>
            <button class="card-bookmark-btn ${this.isBookmarked(sch.id) ? 'saved' : ''}" style="font-size: 1.35rem; padding: 0.5rem;" onclick="scholarships.toggleBookmark(${sch.id}, event); this.classList.toggle('saved', scholarships.isBookmarked(${sch.id})); this.querySelector('i').className = scholarships.isBookmarked(${sch.id}) ? 'fas fa-bookmark' : 'far fa-bookmark';" title="Save for later">
              <i class="${this.isBookmarked(sch.id) ? 'fas' : 'far'} fa-bookmark"></i>
            </button>
          </div>
        </div>

        <!-- VNRVJIET Clearance Notice Banner -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #1e3a8a; border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-bottom: 1.15rem; font-size: 0.84rem; color: #1e40af;">
          <strong style="display: block; margin-bottom: 0.25rem;"><i class="fas fa-university"></i> VNRVJIET Institutional Endorsement Scheme:</strong>
          This is an external scholarship provided by <strong>${app.escapeHtml(sch.provider_name)}</strong>. Students must request college clearance through this portal to receive an official <strong>Digitally Signed Bonafide Certificate</strong> before applying on the external portal.
        </div>

        <!-- Real-Time Active Status Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.65rem 0.95rem; margin-bottom: 1.25rem; font-size: 0.82rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="color: var(--success); font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="fas fa-circle" style="font-size: 0.55rem;"></i> Real-Time Active External Scheme (2026-27 Cycle)
          </span>
          <span style="color: var(--text-muted); font-weight: 600;">
            <i class="far fa-clock"></i> Deadline: <strong>${formattedDeadline}</strong> ${daysLeft > 0 ? `(${daysLeft} days remaining)` : ''}
          </span>
        </div>

        <!-- Exact Eligibility Criteria Box -->
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-xs);">
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.45rem;">
            <i class="fas fa-list-check" style="color: var(--primary);"></i> Exact Eligibility Criteria
          </h4>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem;">
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;"><i class="fas fa-chart-line"></i> Academic Score Cutoff</div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--secondary); margin-top: 0.2rem;">${academicText}</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem;">
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;"><i class="fas fa-rupee-sign"></i> Max Family Income</div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--secondary); margin-top: 0.2rem;">${incomeText}</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem;">
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;"><i class="fas fa-graduation-cap"></i> Target Degree Level</div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--secondary); margin-top: 0.2rem;">${educationText}</div>
            </div>

            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem;">
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;"><i class="fas fa-users"></i> Applicable Quota / Category</div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--secondary); margin-top: 0.2rem;">${app.escapeHtml(sch.category)}</div>
            </div>
          </div>

          <!-- Required Verification Documents -->
          <div style="background: #f8fafc; border-left: 3px solid var(--primary); padding: 0.75rem 1rem; border-radius: 0 var(--radius-xs) var(--radius-xs) 0; font-size: 0.82rem;">
            <strong style="color: var(--secondary); display: block; margin-bottom: 0.35rem;"><i class="fas fa-file-shield"></i> Mandatory Verification Documents:</strong>
            <ul style="padding-left: 1.15rem; color: var(--text-muted); line-height: 1.5; margin: 0;">
              <li>Income Certificate issued by Revenue Authority (Tahsildar / SDM)</li>
              <li>Previous qualifying exam / Class 12 board marksheet</li>
              <li>College Bonafide Certificate / Admission Receipt</li>
              <li>Aadhaar Card with linked Active Bank Account (for DBT Transfer)</li>
            </ul>
          </div>
        </div>

        <!-- Student Profile Match Checklist -->
        ${studentCheckSection}

        <!-- Scheme Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.65rem; background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-top: 1.15rem; font-size: 0.8rem;">
          <div><span style="color: var(--text-muted); display: block; font-size: 0.72rem;">SLOTS SANCTIONED</span> <strong>${sch.slots_available} students</strong></div>
          <div><span style="color: var(--text-muted); display: block; font-size: 0.72rem;">TOTAL APPLICANTS</span> <strong>${sch.total_applicants || 0} applied</strong></div>
          <div><span style="color: var(--text-muted); display: block; font-size: 0.72rem;">APPLICATION STATUS</span> <span class="badge badge-active">Open & Accepting</span></div>
        </div>
      `;

      // Configure Modal Actions
      let actionButtons = `<button class="btn btn-secondary" onclick="app.closeModal('modal-details')">Close</button>`;

      if (sch.application_url) {
        actionButtons += `
          <a href="${sch.application_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
            <i class="fas fa-external-link-alt"></i> Official Portal Link
          </a>
        `;
      }

      if (auth.isStudent()) {
        if (existingApp) {
          if (existingApp.status === 'awarded') {
            actionButtons += `
              <button class="btn btn-primary" onclick="app.closeModal('modal-details'); app.showBonafideModal(${JSON.stringify(existingApp).replace(/"/g, '&quot;')})">
                <i class="fas fa-file-signature"></i> Download / View Digitally Signed Bonafide
              </button>
            `;
          } else {
            actionButtons += `
              <button class="btn btn-secondary" disabled>
                <i class="fas fa-clock"></i> Clearance Requested (${existingApp.status.toUpperCase()})
              </button>
            `;
          }
        } else {
          actionButtons += `
            <button class="btn btn-primary" onclick="scholarships.openApplyModal(${sch.id}, '${app.escapeHtml(sch.title)}')">
              <i class="fas fa-file-signature"></i> Request Bonafide & Clearance
            </button>
          `;
        }
      } else if (!auth.isAuthenticated()) {
        actionButtons += `
          <button class="btn btn-primary" onclick="app.closeModal('modal-details'); app.showModal('modal-login')">
            <i class="fas fa-sign-in-alt"></i> Log In to Request Bonafide
          </button>
        `;
      }

      modalFooter.innerHTML = actionButtons;
      app.showModal('modal-details');
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  // Open apply submission modal
  openApplyModal(scholarshipId, title) {
    app.closeModal('modal-details');
    document.getElementById('apply-scholarship-id').value = scholarshipId;
    document.getElementById('apply-scholarship-title').innerText = title;
    document.getElementById('apply-notes').value = '';
    document.getElementById('apply-ref-num').value = `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    app.showModal('modal-apply');
  },

  // Submit Application
  async submitApplication(event) {
    event.preventDefault();
    const scholarshipId = document.getElementById('apply-scholarship-id').value;
    const refNum = document.getElementById('apply-ref-num').value.trim();
    const notes = document.getElementById('apply-notes').value.trim();
    const btn = document.getElementById('btn-apply-submit');

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      const res = await api.post('/applications/apply', {
        scholarship_id: scholarshipId,
        official_ref_number: refNum,
        student_notes: notes
      });

      if (res.success) {
        app.closeModal('modal-apply');
        app.showToast('Application successfully submitted!', 'success');
        if (typeof student.loadApplications === 'function') {
          await student.loadApplications(true);
        }
        app.switchView('student-applications');
      }
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Confirm Submission';
    }
  },

  // Load "Eligible For Me" Matched Scholarships
  async loadMatchedScholarships() {
    const container = document.getElementById('matched-scholarships-container');
    if (!container) return;

    try {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
          <p style="margin-top: 0.75rem; color: var(--text-muted);">Comparing your profile with scholarship criteria...</p>
        </div>
      `;

      const res = await api.get('/scholarships/matched');
      if (res.success) {
        const eligibleList = res.matched.filter(s => s.is_fully_eligible);
        const ineligibleList = res.matched.filter(s => !s.is_fully_eligible);

        if (eligibleList.length === 0 && ineligibleList.length === 0) {
          container.innerHTML = `<p style="text-align: center; padding: 2rem;">No active scholarships available at the moment.</p>`;
          return;
        }

        let html = `
          <div style="grid-column: 1 / -1; margin-bottom: 1rem;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1rem; border-radius: var(--radius-md);">
              <h3 style="color: #065f46; font-size: 1.15rem; margin-bottom: 0.25rem;">
                <i class="fas fa-check-circle"></i> We matched ${eligibleList.length} scholarships you qualify for!
              </h3>
              <p style="color: #047857; font-size: 0.9rem;">
                Based on your current GPA, family income, and academic level from your profile.
              </p>
            </div>
          </div>
        `;

        if (eligibleList.length > 0) {
          html += eligibleList.map(item => `
            <div class="scholarship-card" style="border-color: #86efac;">
              <div>
                <div class="card-top">
                  <span class="card-category-tag" style="background-color: #dcfce7; color: #15803d;">100% Eligible</span>
                  <span class="card-award-amount">₹${item.award_amount.toLocaleString('en-IN')}</span>
                </div>
                <h3 class="card-title" title="${app.escapeHtml(item.title)}">${app.escapeHtml(item.title)}</h3>
                <p class="card-provider-text"><i class="fas fa-university"></i> ${app.escapeHtml(item.provider_name)}</p>

                <div class="card-criteria-box">
                  <div class="criteria-item">
                    <span class="label">Target Level:</span>
                    <span class="value">${app.escapeHtml(item.education_level)}</span>
                  </div>
                  <div class="criteria-item">
                    <span class="label">Academic Required:</span>
                    <span class="value">${item.min_gpa > 0 ? item.min_gpa + ' CGPA / %' : 'Any'}</span>
                  </div>
                </div>
              </div>
              <div class="card-bottom-actions">
                <span class="card-deadline-text"><i class="far fa-clock"></i> ${item.deadline}</span>
                <button class="btn btn-primary btn-sm" onclick="scholarships.viewDetails(${item.id})">Details & Apply</button>
              </div>
            </div>
          `).join('');
        }

        container.innerHTML = html;
      }
    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); text-align: center;">Error matching scholarships: ${err.message}</p>`;
    }
  }
};
