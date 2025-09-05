<?php
/**
 * Session Handler for PathFinder
 * Handles session checks, logout, and user info
 */

require_once '../config/database.php';

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    session_start();
    header('Location: ../auth/signin.html');
    exit;
}

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'check_session':
            $response = [
                'logged_in' => isLoggedIn(),
                'is_admin' => isAdmin(),
                'is_user' => isUser(),
                'user_info' => null
            ];
            
            if (isLoggedIn()) {
                if (isUser()) {
                    $response['user_info'] = [
                        'id' => getSession('user_id'),
                        'name' => getSession('user_name'),
                        'email' => getSession('user_email'),
                        'type' => 'user'
                    ];
                } else if (isAdmin()) {
                    $response['user_info'] = [
                        'id' => getSession('admin_id'),
                        'email' => getSession('admin_email'),
                        'type' => 'admin'
                    ];
                }
            }
            
            echo json_encode($response);
            break;
            
        case 'logout':
            session_destroy();
            session_start();
            echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}

// Function to check if user should have access to a page
function requireAuth($adminOnly = false) {
    if ($adminOnly && !isAdmin()) {
        header('Location: ../auth/signin.html');
        exit;
    }
    
    if (!$adminOnly && !isLoggedIn()) {
        header('Location: ../auth/signin.html');
        exit;
    }
}

// Function to redirect if already logged in
function redirectIfLoggedIn() {
    if (isAdmin()) {
        header('Location: ../admin/dashboard.html');
        exit;
    } else if (isUser()) {
        header('Location: ../../index.html');
        exit;
    }
}
?>