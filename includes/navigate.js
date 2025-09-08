
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

/**
 * Initialize navigation based on user status
 */
async function initializeNavigation() {
    try {
        const userStatus = await checkUserStatus();
        updateNavigation(userStatus);
    } catch (error) {
        console.error('Error initializing navigation:', error);
        // Show default navigation if error
        updateNavigation({ logged_in: false });
    }
}

/**
 * Check current user status
 */
async function checkUserStatus() {
    try {
        const response = await fetch('includes/session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=check_session'
        });
        return await response.json();
    } catch (error) {
        console.error('Error checking user status:', error);
        return { logged_in: false };
    }
}


function updateNavigation(userStatus) {
    const nav = document.querySelector('nav');
    if (!nav) return;

    if (userStatus.logged_in) {
        if (userStatus.is_admin) {
            // Admin navigation
            nav.innerHTML = `
                <a href="index.html">Home</a>
                <a href="Pages/Features/help/feature.html">Features</a>
                <a href="Pages/Features/about/about.html">About</a>
                <a href="Pages/Features/help/help.html">Help</a>
                <div class="nav-user-menu">
                    <div class="nav-user-info">
                        <i class="fas fa-user-shield"></i>
                        <span>Admin</span>
                    </div>
                    <div class="nav-dropdown">
                        <a href="Pages/admin/dashboard.html">
                            <i class="fas fa-tachometer-alt"></i>
                            Admin Dashboard
                        </a>
                        <a href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Regular user navigation
            nav.innerHTML = `
                <a href="index.html">Home</a>
                <a href="Pages/Features/help/feature.html">Features</a>
                <a href="Pages/Features/about/about.html">About</a>
                <a href="Pages/Features/help/help.html">Help</a>
                <div class="nav-user-menu">
                    <div class="nav-user-info">
                        <i class="fas fa-user"></i>
                        <span>${userStatus.user_info?.name || 'User'}</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="nav-dropdown">
                        <a href="Pages/applications/my-applications.html">
                            <i class="fas fa-file-alt"></i>
                            My Applications
                        </a>
                        <a href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </a>
                    </div>
                </div>
            `;
        }
        
        setupUserDropdown();
    } else {
        // Guest navigation (default)
        nav.innerHTML = `
            <a href="index.html">Home</a>
            <a href="Pages/Features/help/feature.html">Features</a>
            <a href="Pages/Features/about/about.html">About</a>
            <a href="Pages/Features/help/help.html">Help</a>
            <button onclick="window.location.href='Pages/auth/signin.html'">Login</button>
            <button onclick="window.location.href='Pages/auth/signup.html'">Sign Up</button>
        `;
    }
}

/**
 * Setup user dropdown functionality
 */
function setupUserDropdown() {
    const userMenu = document.querySelector('.nav-user-menu');
    const userInfo = document.querySelector('.nav-user-info');
    const dropdown = document.querySelector('.nav-dropdown');
    
    if (userMenu && userInfo && dropdown) {
        userInfo.addEventListener('click', function(e) {
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
 * Logout function
 */
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const response = await fetch('includes/session.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=logout'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Clear any local storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to home page
                window.location.href = 'index.html';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if API call fails
            window.location.href = 'index.html';
        }
    }
}