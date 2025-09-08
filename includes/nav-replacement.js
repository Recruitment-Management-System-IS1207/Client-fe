/**
 * Dynamic Navigation Replacement
 * This script replaces existing navigation with dynamic content based on user login status
 */

document.addEventListener('DOMContentLoaded', function() {
    replaceDynamicNavigation();
});

/**
 * Replace existing navigation with dynamic content
 */
async function replaceDynamicNavigation() {
    try {
        const userStatus = await checkUserStatus();
        const nav = document.querySelector('nav');
        
        if (!nav) return;
        
        // Store original navigation as backup
        const originalNav = nav.innerHTML;
        
        // Replace with dynamic navigation
        updateNavigationContent(nav, userStatus);
        
    } catch (error) {
        console.error('Error updating navigation:', error);
        // Keep original navigation if error occurs
    }
}

/**
 * Check user login status
 */
async function checkUserStatus() {
    try {
        // Try different paths since this script is used from different directories
        const possiblePaths = [
            'includes/session.php',
            '../includes/session.php', 
            '../../includes/session.php'
        ];
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=check_session'
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (pathError) {
                // Try next path
                continue;
            }
        }
        
        // If all paths fail, return not logged in
        return { logged_in: false };
        
    } catch (error) {
        console.error('Error checking user status:', error);
        return { logged_in: false };
    }
}

/**
 * Update navigation content based on user status
 */
function updateNavigationContent(nav, userStatus) {
    // Get current page path to determine correct link paths
    const currentPath = window.location.pathname;
    const isInSubFolder = currentPath.includes('/Pages/');
    const isInDeepFolder = (currentPath.match(/\//g) || []).length > 2;
    
    // Determine path prefix for links
    let pathPrefix = '';
    if (isInDeepFolder) {
        pathPrefix = '../../';
    } else if (isInSubFolder) {
        pathPrefix = '../';
    }
    
    if (userStatus.logged_in) {
        if (userStatus.is_admin) {
            // Admin navigation
            nav.innerHTML = `
                <a href="${pathPrefix}index.html">Home</a>
                <a href="${pathPrefix}Pages/Features/help/feature.html">Features</a>
                <a href="${pathPrefix}Pages/Features/about/about.html">About</a>
                <a href="${pathPrefix}Pages/Features/help/help.html">Help</a>
                <div class="nav-user-menu" data-user-type="admin">
                    <div class="nav-user-info">
                        <i class="fas fa-user-shield"></i>
                        <span>Admin</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="nav-dropdown">
                        <a href="${pathPrefix}Pages/admin/dashboard.html">
                            <i class="fas fa-tachometer-alt"></i>
                            Admin Dashboard
                        </a>
                        <a href="#" onclick="performLogout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Regular user navigation
            nav.innerHTML = `
                <div class="nav-links">
                    <a href="${pathPrefix}index.html">Home</a>
                    <a href="${pathPrefix}Pages/Features/help/feature.html">Features</a>
                    <a href="${pathPrefix}Pages/Features/about/about.html">About</a>
                    <a href="${pathPrefix}Pages/Features/help/help.html">Help</a>
                </div>
                <div class="nav-user-menu" data-user-type="user">
                    <div class="nav-user-info">
                        <img src="${pathPrefix}Assests/icons/profile.svg" alt="Profile" class="profile-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="nav-dropdown">
                        <a href="${pathPrefix}Pages/applications/my-applications.html">
                            <i class="fas fa-file-alt"></i>
                            My Applications
                        </a>
                        <a href="#" onclick="performLogout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Add dropdown functionality
        setupUserDropdown();
        
        // Load navigation styles if not already loaded
        loadNavigationStyles();
        
    }
    // If not logged in, keep the original hardcoded navigation (Login/Signup buttons)
}

/**
 * Setup dropdown functionality
 */
function setupUserDropdown() {
    const userMenu = document.querySelector('.nav-user-menu');
    const userInfo = document.querySelector('.nav-user-info');
    const dropdown = document.querySelector('.nav-dropdown');
    
    if (userMenu && userInfo && dropdown) {
        // Remove any existing listeners
        userInfo.replaceWith(userInfo.cloneNode(true));
        const newUserInfo = document.querySelector('.nav-user-info');
        
        newUserInfo.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdown.classList.remove('active');
        });
        
        // Prevent dropdown from closing when clicking inside
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

/**
 * Load navigation styles dynamically
 */
function loadNavigationStyles() {
    // Check if styles are already loaded
    if (document.getElementById('dynamic-nav-styles')) return;
    
    const styles = `
        <style id="dynamic-nav-styles">
        /* Dynamic Navigation Styles */
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
        }

        .nav-user-menu {
            position: relative;
            margin-left: auto;
        }

        .nav-user-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            margin-right: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 25px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            backdrop-filter: blur(5px);
        }

        .nav-user-info:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-1px);
        }

        .nav-user-info i.fa-chevron-down {
            font-size: 0.8rem;
            transition: transform 0.3s ease;
        }

        .nav-dropdown.active + .nav-user-info i.fa-chevron-down,
        .nav-user-menu:hover .nav-user-info i.fa-chevron-down {
            transform: rotate(180deg);
        }

        .nav-dropdown {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            padding: 0.5rem 0;
            min-width: 200px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            z-index: 1000;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .nav-dropdown.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .nav-dropdown a {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            color: #333;
            text-decoration: none;
            transition: all 0.2s ease;
            border-bottom: 1px solid #f0f0f0;
            font-weight: 500;
        }

        .nav-dropdown a:last-child {
            border-bottom: none;
        }

        .nav-dropdown a:hover {
            background: #f8f9fa;
            color: #f1683a;
            padding-left: 1.25rem;
        }

        .nav-dropdown a i {
            width: 16px;
            text-align: center;
            font-size: 0.9rem;
        }

        .nav-dropdown a[onclick*="logout"] {
            color: #dc3545;
            border-top: 1px solid #f0f0f0;
            margin-top: 0.25rem;
        }

        .nav-dropdown a[onclick*="logout"]:hover {
            background: #fff5f5;
            color: #dc3545;
        }

        .nav-user-menu[data-user-type="admin"] .nav-user-info {
            background: linear-gradient(45deg, rgba(220, 53, 69, 0.2), rgba(253, 126, 20, 0.2));
            border-color: rgba(220, 53, 69, 0.4);
        }

        .nav-user-menu[data-user-type="user"] .nav-user-info {
            background: transparent;
            border: none;
        }

        .profile-icon {
            width: 24px;
            height: 24px;
            object-fit: contain;
            filter: invert(1);
        }

        @media (max-width: 768px) {
            .nav-user-info span {
                display: none;
            }
            
            .nav-dropdown {
                right: -10px;
                min-width: 180px;
            }
        }
        
        @media (max-width: 480px) {
            .nav-dropdown {
                position: fixed;
                top: 70px;
                right: 10px;
                left: 10px;
                width: auto;
                min-width: auto;
            }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Perform logout
 */
async function performLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Try different paths for logout
            const possiblePaths = [
                'includes/session.php',
                '../includes/session.php', 
                '../../includes/session.php'
            ];
            
            for (const path of possiblePaths) {
                try {
                    const response = await fetch(path, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'action=logout'
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            // Clear storage
                            localStorage.clear();
                            sessionStorage.clear();
                            
                            // Redirect to home
                            const currentPath = window.location.pathname;
                            const isInSubFolder = currentPath.includes('/Pages/');
                            const isInDeepFolder = (currentPath.match(/\//g) || []).length > 2;
                            
                            let homePath = 'index.html';
                            if (isInDeepFolder) {
                                homePath = '../../index.html';
                            } else if (isInSubFolder) {
                                homePath = '../index.html';
                            }
                            
                            window.location.href = homePath;
                            return;
                        }
                    }
                } catch (pathError) {
                    continue;
                }
            }
            
            // Fallback: redirect anyway
            window.location.href = '/';
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect
            window.location.href = '/';
        }
    }
}

// Make logout function globally available
window.performLogout = performLogout;