/**
 * Modern Admin Dashboard JavaScript
 * Handles all dashboard functionality
 */

// Global variables
let currentApplications = [];
let currentJobs = [];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

/**
 * Initialize the dashboard
 */
function initializeDashboard() {
    loadDashboardData();
    loadCategories();
    setupEventListeners();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Form submission
    document.getElementById('addJobForm').addEventListener('submit', handleAddJob);
    
    // Modal close events
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Load dashboard statistics and recent activity
 */
async function loadDashboardData() {
    try {
        // Load application statistics
        const appResponse = await fetch('../../api/applications.php?action=stats');
        const appData = await appResponse.json();
        
        if (appData.success) {
            updateStatistics(appData.stats);
            displayRecentApplications(appData.stats.recent_applications);
        }

        // Load job statistics
        const jobResponse = await fetch('../../api/jobs.php?action=stats');
        const jobData = await jobResponse.json();
        
        if (jobData.success) {
            document.getElementById('activeJobs').textContent = jobData.stats.total_jobs || 0;
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

/**
 * Update statistics cards
 */
function updateStatistics(stats) {
    document.getElementById('totalApplications').textContent = stats.total_applications || 0;
    document.getElementById('pendingApplications').textContent = stats.pending_applications || 0;
    document.getElementById('monthlyApplications').textContent = stats.total_applications || 0;
}

/**
 * Display recent applications
 */
function displayRecentApplications(applications) {
    const container = document.getElementById('recentApplications');
    
    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>No Recent Applications</h3>
                <p>New applications will appear here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = applications.map(app => `
        <div class="activity-item">
            <span class="activity-time">${timeAgo(app.applied_at)}</span>
            <p><strong>${escapeHtml(app.full_name)}</strong> applied for <em>${escapeHtml(app.title)}</em></p>
        </div>
    `).join('');
}

/**
 * Show different sections
 */
function showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`).parentElement;
    activeNavItem.classList.add('active');

    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionName + 'Section').classList.add('active');

    // Load section-specific data
    switch(sectionName) {
        case 'applications':
            loadApplications();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'dashboard':
            loadDashboardData();
            break;
    }
}

/**
 * Load applications
 */
async function loadApplications() {
    const container = document.getElementById('applicationsList');
    container.innerHTML = '<div class="loading-spinner">Loading applications...</div>';
    
    try {
        const response = await fetch('../../api/applications.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            currentApplications = data.applications;
            displayApplications(currentApplications);
        } else {
            showEmptyState(container, 'No applications found', 'Applications will appear here when users apply for jobs');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Applications</h3>
                <p>Please try again later</p>
                <button class="btn-primary" onclick="loadApplications()">Retry</button>
            </div>
        `;
    }
}

/**
 * Display applications
 */
function displayApplications(applications) {
    const container = document.getElementById('applicationsList');
    
    if (!applications || applications.length === 0) {
        showEmptyState(container, 'No Applications', 'Applications will appear here when users apply for jobs');
        return;
    }

    container.innerHTML = applications.map(app => `
        <div class="application-card">
            <div class="application-header">
                <div class="applicant-info">
                    <h4>${escapeHtml(app.full_name)}</h4>
                    <p class="job-title">${escapeHtml(app.job_title)} at ${escapeHtml(app.company)}</p>
                    <p class="application-date">Applied ${timeAgo(app.applied_at)}</p>
                </div>
                <div class="application-status">
                    <span class="status-badge ${app.status}">${capitalizeFirst(app.status)}</span>
                </div>
            </div>
            <div class="application-status">
                <select class="status-select" onchange="updateApplicationStatus(${app.id}, this.value)">
                    <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="reviewed" ${app.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                    <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                    <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="hired" ${app.status === 'hired' ? 'selected' : ''}>Hired</option>
                </select>
            </div>
            <div class="application-actions">
                <button class="btn-primary btn-sm" onclick="viewApplicationDetails(${app.id})">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Filter applications by status
 */
function filterApplications() {
    const status = document.getElementById('statusFilter').value;
    
    let filtered = currentApplications;
    if (status !== 'all') {
        filtered = currentApplications.filter(app => app.status === status);
    }
    
    displayApplications(filtered);
}

/**
 * Update application status
 */
async function updateApplicationStatus(applicationId, newStatus) {
    try {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('id', applicationId);
        formData.append('status', newStatus);

        const response = await fetch('../../api/applications.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            // Update the application in current list
            const app = currentApplications.find(a => a.id == applicationId);
            if (app) {
                app.status = newStatus;
            }
            
            // Update the status badge in UI
            const card = document.querySelector(`[onchange*="${applicationId}"]`).closest('.application-card');
            const badge = card.querySelector('.status-badge');
            badge.className = `status-badge ${newStatus}`;
            badge.textContent = capitalizeFirst(newStatus);
            
            showNotification('Application status updated successfully', 'success');
        } else {
            showNotification(data.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
}

/**
 * View application details in modal
 */
async function viewApplicationDetails(applicationId) {
    try {
        const response = await fetch(`../../api/applications.php?action=get&id=${applicationId}`);
        const data = await response.json();
        
        if (data.success) {
            showApplicationModal(data.application);
        } else {
            showNotification('Failed to load application details', 'error');
        }
    } catch (error) {
        console.error('Error loading application details:', error);
        showNotification('Error loading application details', 'error');
    }
}

/**
 * Show application details modal
 */
function showApplicationModal(application) {
    const modal = document.getElementById('applicationModal');
    const details = document.getElementById('applicationDetails');
    
    details.innerHTML = `
        <div class="application-details">
            <h4><i class="fas fa-briefcase"></i> Job Information</h4>
            <p><strong>Position:</strong> ${escapeHtml(application.job_title)}</p>
            <p><strong>Company:</strong> ${escapeHtml(application.company)}</p>
            <p><strong>Location:</strong> ${escapeHtml(application.location)}</p>
            
            <h4><i class="fas fa-user"></i> Applicant Information</h4>
            <p><strong>Name:</strong> ${escapeHtml(application.full_name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(application.email)}">${escapeHtml(application.email)}</a></p>
            <p><strong>Phone:</strong> <a href="tel:${escapeHtml(application.phone)}">${escapeHtml(application.phone)}</a></p>
            <p><strong>Address:</strong> ${escapeHtml(application.address)}</p>
            
            <h4><i class="fas fa-info-circle"></i> Application Details</h4>
            <p><strong>Status:</strong> <span class="status-badge ${application.status}">${capitalizeFirst(application.status)}</span></p>
            <p><strong>Applied:</strong> ${formatDate(application.applied_at)} (${timeAgo(application.applied_at)})</p>
            
            <h4><i class="fas fa-comment"></i> Additional Information</h4>
            <p>${escapeHtml(application.additional_info).replace(/\n/g, '<br>')}</p>
            
            <h4><i class="fas fa-paperclip"></i> Uploaded Documents</h4>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <p><i class="fas fa-file-pdf"></i> <strong>CV/Resume:</strong></p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">${application.cv_file}</p>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <p><i class="fas fa-file-alt"></i> <strong>Cover Letter:</strong></p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">${application.motivation_file}</p>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

/**
 * Load jobs
 */
async function loadJobs() {
    const container = document.getElementById('jobsList');
    container.innerHTML = '<div class="loading-spinner">Loading jobs...</div>';
    
    try {
        const response = await fetch('../../api/jobs.php?action=list');
        const data = await response.json();
        
        if (data.success) {
            currentJobs = data.jobs;
            displayJobs(currentJobs);
        } else {
            showEmptyState(container, 'No jobs found', 'Create your first job posting to get started');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Jobs</h3>
                <p>Please try again later</p>
                <button class="btn-primary" onclick="loadJobs()">Retry</button>
            </div>
        `;
    }
}

/**
 * Display jobs
 */
function displayJobs(jobs) {
    const container = document.getElementById('jobsList');
    
    if (!jobs || jobs.length === 0) {
        showEmptyState(container, 'No Jobs Posted', 'Create your first job posting to get started');
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div class="job-info">
                    <h4>${escapeHtml(job.title)}</h4>
                    <p class="job-company">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</p>
                    <p class="job-date">
                        <i class="fas fa-calendar-alt"></i>
                        Posted ${timeAgo(job.created_at)}
                    </p>
                </div>
                <div class="job-status">
                    <span class="status-badge ${job.is_active ? 'shortlisted' : 'rejected'}">
                        ${job.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="job-meta">
                <p><strong>Type:</strong> ${escapeHtml(job.job_type)}</p>
                <p><strong>Category:</strong> ${escapeHtml(job.category_name || 'General')}</p>
                <p><strong>Salary:</strong> ${job.salary_range}</p>
            </div>
            <div class="job-actions">
                <button class="btn-${job.is_active ? 'warning' : 'success'} btn-sm" 
                        onclick="toggleJobStatus(${job.id}, ${job.is_active})">
                    <i class="fas fa-${job.is_active ? 'pause' : 'play'}"></i>
                    ${job.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn-danger btn-sm" onclick="deleteJob(${job.id})">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Toggle job status (active/inactive)
 */
async function toggleJobStatus(jobId, currentStatus) {
    const newStatus = currentStatus ? 0 : 1;
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this job?`)) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('id', jobId);
        formData.append('is_active', newStatus);

        const response = await fetch('../../api/jobs.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification(`Job ${action}d successfully`, 'success');
            loadJobs(); // Reload jobs list
        } else {
            showNotification(`Failed to ${action} job`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action}ing job:`, error);
        showNotification(`Error ${action}ing job`, 'error');
    }
}

/**
 * Delete job
 */
async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', jobId);

        const response = await fetch('../../api/jobs.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Job deleted successfully', 'success');
            loadJobs(); // Reload jobs list
        } else {
            showNotification('Failed to delete job', 'error');
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        showNotification('Error deleting job', 'error');
    }
}

/**
 * Load categories for the add job form
 */
async function loadCategories() {
    try {
        const response = await fetch('../../api/jobs.php?action=categories');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('categorySelect');
            select.innerHTML = '<option value="">Select Category</option>' +
                data.categories.map(cat => 
                    `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Handle add job form submission
 */
async function handleAddJob(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Job...';
    
    try {
        const formData = new FormData(form);
        formData.append('action', 'add');
        
        const response = await fetch('../../api/jobs.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Job added successfully!', 'success');
            form.reset();
            showSection('jobs'); // Switch to jobs section
        } else {
            showNotification(data.message || 'Failed to add job', 'error');
        }
    } catch (error) {
        console.error('Error adding job:', error);
        showNotification('Error adding job', 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Clear the add job form
 */
function clearForm() {
    document.getElementById('addJobForm').reset();
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('applicationModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
}

/**
 * Admin logout
 */
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear any stored session data
        localStorage.removeItem('admin_session');
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = '../auth/signin.html';
    }
}

/**
 * Show notification (you can enhance this with a proper notification system)
 */
function showNotification(message, type = 'info') {
    // Simple alert for now - you can replace with a fancy notification system
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    alert(`${icons[type]} ${message}`);
}

/**
 * Show empty state
 */
function showEmptyState(container, title, description) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fas fa-inbox"></i>
            </div>
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;
}

/**
 * Utility Functions
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function timeAgo(datetime) {
    const now = new Date();
    const past = new Date(datetime);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' minutes ago';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + ' hours ago';
    if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + ' days ago';
    if (diffInSeconds < 2592000) return Math.floor(diffInSeconds / 604800) + ' weeks ago';
    return Math.floor(diffInSeconds / 2592000) + ' months ago';
}

function formatDate(datetime) {
    return new Date(datetime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Mobile menu toggle (for responsive design)
 */
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-open');
}

/**
 * Search functionality (can be enhanced)
 */
function searchApplications(query) {
    if (!query.trim()) {
        displayApplications(currentApplications);
        return;
    }
    
    const filtered = currentApplications.filter(app => 
        app.full_name.toLowerCase().includes(query.toLowerCase()) ||
        app.job_title.toLowerCase().includes(query.toLowerCase()) ||
        app.company.toLowerCase().includes(query.toLowerCase())
    );
    
    displayApplications(filtered);
}

function searchJobs(query) {
    if (!query.trim()) {
        displayJobs(currentJobs);
        return;
    }
    
    const filtered = currentJobs.filter(job => 
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.company.toLowerCase().includes(query.toLowerCase()) ||
        job.location.toLowerCase().includes(query.toLowerCase())
    );
    
    displayJobs(filtered);
}

/**
 * Export functionality (basic implementation)
 */
function exportApplications() {
    if (currentApplications.length === 0) {
        showNotification('No applications to export', 'warning');
        return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Name,Email,Phone,Job Title,Company,Status,Applied Date\n"
        + currentApplications.map(app => 
            `"${app.full_name}","${app.email}","${app.phone}","${app.job_title}","${app.company}","${app.status}","${app.applied_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "applications.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Applications exported successfully', 'success');
}

function exportJobs() {
    if (currentJobs.length === 0) {
        showNotification('No jobs to export', 'warning');
        return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Title,Company,Location,Type,Category,Status,Posted Date\n"
        + currentJobs.map(job => 
            `"${job.title}","${job.company}","${job.location}","${job.job_type}","${job.category_name || ''}","${job.is_active ? 'Active' : 'Inactive'}","${job.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jobs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Jobs exported successfully', 'success');
}

/**
 * Auto-refresh functionality
 */
let autoRefreshInterval;

function startAutoRefresh() {
    // Refresh dashboard data every 5 minutes
    autoRefreshInterval = setInterval(() => {
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            if (sectionId === 'dashboardSection') {
                loadDashboardData();
            } else if (sectionId === 'applicationsSection') {
                loadApplications();
            } else if (sectionId === 'jobsSection') {
                loadJobs();
            }
        }
    }, 300000); // 5 minutes
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + number keys for navigation
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                showSection('dashboard');
                break;
            case '2':
                e.preventDefault();
                showSection('applications');
                break;
            case '3':
                e.preventDefault();
                showSection('jobs');
                break;
            case '4':
                e.preventDefault();
                showSection('add-job');
                break;
        }
    }
});

/**
 * Initialize auto-refresh when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    startAutoRefresh();
});

/**
 * Clean up when page unloads
 */
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

/**
 * Handle form validation
 */
function validateJobForm() {
    const form = document.getElementById('addJobForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--danger-color)';
            isValid = false;
        } else {
            field.style.borderColor = 'var(--border-color)';
        }
    });
    
    return isValid;
}

/**
 * Real-time form validation
 */
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addJobForm');
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = 'var(--danger-color)';
                } else {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
        });
    }
});

/**
 * Enhanced notification system (replaces simple alert)
 */
function showAdvancedNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: 1rem;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        min-width: 300px;
        max-width: 500px;
        animation: slideInRight 0.3s ease;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add notification animations to CSS (you can add this to your CSS file)
const notificationStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--radius-sm);
    }
    
    .notification-close:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

/**
 * Performance optimization: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Use debounced search functions
const debouncedSearchApplications = debounce(searchApplications, 300);
const debouncedSearchJobs = debounce(searchJobs, 300);