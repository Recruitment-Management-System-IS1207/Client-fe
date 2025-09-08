

// Global variables
let allJobs = [];
let currentCategory = '';
let currentCategoryName = '';

/**
 * Initialize jobs page
 */
function initializeJobsPage(categorySlug, categoryName) {
    currentCategory = categorySlug;
    currentCategoryName = categoryName;
    loadJobs();
}

/**
 * Load jobs from API
 */
async function loadJobs() {
    showLoading(true);
    
    try {
        const url = currentCategory 
            ? `../../api/jobs.php?action=list&category=${currentCategory}`
            : `../../api/jobs.php?action=list`;
            
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allJobs = data.jobs;
            displayJobs(allJobs);
            showLoading(false);
        } else {
            showError(data.message || 'Failed to load jobs');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        showError('Failed to connect to server. Please check your connection.');
    }
}

/**
 * Display jobs in the UI
 */
function displayJobs(jobs) {
    const container = document.getElementById('jobListings');
    
    if (!jobs || jobs.length === 0) {
        showEmpty();
        return;
    }
    
    container.innerHTML = jobs.map(job => createJobCard(job)).join('');
    showJobListings();
}

/**
 * Create individual job card HTML
 */
function createJobCard(job) {
    const categoryColor = getCategoryColor(job.category_name);
    
    return `
        <div class="job-card" data-job-id="${job.id}">
            <div class="job-header">
                <h2>${escapeHtml(job.title)}</h2>
                <span class="job-category" style="background: ${categoryColor.bg}; color: ${categoryColor.text}">
                    ${escapeHtml(job.category_name || 'General')}
                </span>
            </div>
            <div class="company">${escapeHtml(job.company)}</div>
            <div class="location"> ${escapeHtml(job.location)}</div>
            <p class="description">${truncateText(escapeHtml(job.description), 150)}</p>
            <div class="job-details">
                <div class="details">
                    <span class="salary"> ${job.salary_range}</span>
                    <span class="job-type"> ${escapeHtml(job.job_type)}</span>
                </div>
                <div class="job-meta">
                    <span class="posted-date">Posted ${job.created_ago}</span>
                </div>
            </div>
            <div class="job-actions">
                <button class="apply-btn" onclick="applyToJob(${job.id})">Apply Now</button>
                <button class="view-btn" onclick="viewJobDetails(${job.id})">View Details</button>
            </div>
        </div>
    `;
}

/**
 * Search jobs
 */
async function searchJobs() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (searchTerm === '') {
        displayJobs(allJobs);
        return;
    }
    
    showLoading(true);
    
    try {
        let url = `../../api/jobs.php?action=search&q=${encodeURIComponent(searchTerm)}`;
        if (currentCategory) {
            url += `&category=${currentCategory}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayJobs(data.jobs);
            showLoading(false);
        } else {
            showError(data.message || 'Search failed');
        }
    } catch (error) {
        console.error('Error searching jobs:', error);
        showError('Search failed. Please try again.');
    }
}

/**
 * Apply to job
 */
function applyToJob(jobId) {
    // Store job ID for application process
    sessionStorage.setItem('applying_job_id', jobId);
    window.location.href = 'apply.html';
}

/**
 * View job details
 */
function viewJobDetails(jobId) {
    window.location.href = `job-details.html?id=${jobId}`;
}

/**
 * UI State Management Functions
 */
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
    document.getElementById('jobListings').style.display = show ? 'none' : 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('jobListings').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    
    const errorElement = document.getElementById('errorState').querySelector('p');
    errorElement.textContent = message;
}

function showEmpty() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('jobListings').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}

function showJobListings() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('jobListings').style.display = 'grid';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

/**
 * Utility Functions
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

/**
 * Get category-specific colors
 */
function getCategoryColor(categoryName) {
    const colors = {
        'Engineering': { bg: '#e3f2fd', text: '#1976d2' },
        'Information Technology': { bg: '#e8f5e8', text: '#2e7d32' },
        'Management': { bg: '#fff3e0', text: '#f57c00' },
        'Agriculture': { bg: '#f3e5f5', text: '#7b1fa2' },
        'Bakery & Food': { bg: '#fce4ec', text: '#c2185b' }
    };
    
    return colors[categoryName] || { bg: '#f5f5f5', text: '#666666' };
}

/**
 * Handle Enter key in search input
 */
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchJobs();
            }
        });
    }
});

/**
 * Filter jobs by type
 */
function filterByJobType(jobType) {
    if (jobType === 'all') {
        displayJobs(allJobs);
        return;
    }
    
    const filtered = allJobs.filter(job => 
        job.job_type.toLowerCase() === jobType.toLowerCase()
    );
    displayJobs(filtered);
}

/**
 * Sort jobs
 */
function sortJobs(sortBy) {
    let sorted = [...allJobs];
    
    switch(sortBy) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'salary_high':
            sorted.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
            break;
        case 'salary_low':
            sorted.sort((a, b) => (a.salary_min || 0) - (b.salary_min || 0));
            break;
        case 'company':
            sorted.sort((a, b) => a.company.localeCompare(b.company));
            break;
        default:
            // Default sorting by newest
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    displayJobs(sorted);
}

/**
 * Load more jobs (pagination)
 */
async function loadMoreJobs(offset = 0, limit = 10) {
    try {
        let url = `../../api/jobs.php?action=list&limit=${limit}&offset=${offset}`;
        if (currentCategory) {
            url += `&category=${currentCategory}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.jobs.length > 0) {
            // Append new jobs to existing ones
            allJobs = [...allJobs, ...data.jobs];
            displayJobs(allJobs);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading more jobs:', error);
        return false;
    }
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus() {
    try {
        const response = await fetch('../../includes/session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=check_session'
        });
        const data = await response.json();
        return data.logged_in;
    } catch (error) {
        console.error('Error checking login status:', error);
        return false;
    }
}