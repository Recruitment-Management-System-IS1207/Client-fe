<?php
/**
 * PathFinder Authentication System
 * Handles user registration, login, and session management
 */

require_once '../config/database.php';

class Auth {
    
    /**
     * Register a new user
     */
    public static function registerUser($fullName, $phone, $email, $password) {
        try {
            // Validate input
            if (empty($fullName) || empty($phone) || empty($email) || empty($password)) {
                return ['success' => false, 'message' => 'All fields are required'];
            }
            
            if (!isValidEmail($email)) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }
            
            if (strlen($password) < 6) {
                return ['success' => false, 'message' => 'Password must be at least 6 characters'];
            }
            
            // Check if email already exists
            $existingUser = fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
            if ($existingUser) {
                return ['success' => false, 'message' => 'Email already registered'];
            }
            
            // Hash password and insert user
            $hashedPassword = hashPassword($password);
            $sql = "INSERT INTO users (full_name, phone, email, password) VALUES (?, ?, ?, ?)";
            $stmt = executeQuery($sql, [$fullName, $phone, $email, $hashedPassword]);
            
            if ($stmt) {
                return ['success' => true, 'message' => 'Registration successful'];
            }
            
            return ['success' => false, 'message' => 'Registration failed'];
            
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Registration failed'];
        }
    }
    
    /**
     * Login user
     */
    public static function loginUser($email, $password) {
        try {
            if (empty($email) || empty($password)) {
                return ['success' => false, 'message' => 'Email and password are required'];
            }
            
            if (!isValidEmail($email)) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }
            
            // Check user credentials
            $user = fetchOne("SELECT id, full_name, email, password FROM users WHERE email = ?", [$email]);
            
            if ($user && verifyPassword($password, $user['password'])) {
                // Set session
                setSession('user_id', $user['id']);
                setSession('user_name', $user['full_name']);
                setSession('user_email', $user['email']);
                
                return ['success' => true, 'message' => 'Login successful', 'user' => $user];
            }
            
            return ['success' => false, 'message' => 'Invalid email or password'];
            
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Login failed'];
        }
    }
    
    /**
     * Login admin
     */
    public static function loginAdmin($email, $password) {
        try {
            if (empty($email) || empty($password)) {
                return ['success' => false, 'message' => 'Email and password are required'];
            }
            
            if (!isValidEmail($email)) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }
            
            // Check admin credentials
            $admin = fetchOne("SELECT id, email, password FROM admins WHERE email = ?", [$email]);
            
            if ($admin && verifyPassword($password, $admin['password'])) {
                // Set session
                setSession('admin_id', $admin['id']);
                setSession('admin_email', $admin['email']);
                
                return ['success' => true, 'message' => 'Admin login successful', 'admin' => $admin];
            }
            
            return ['success' => false, 'message' => 'Invalid admin credentials'];
            
        } catch (Exception $e) {
            error_log("Admin login error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Login failed'];
        }
    }
    
    /**
     * Logout user/admin
     */
    public static function logout() {
        destroySession();
        return ['success' => true, 'message' => 'Logged out successfully'];
    }
    
    /**
     * Check if user is authenticated
     */
    public static function requireAuth($adminOnly = false) {
        if ($adminOnly && !isAdmin()) {
            header('Location: ../auth/signin.html');
            exit;
        }
        
        if (!$adminOnly && !isLoggedIn()) {
            header('Location: ../auth/signin.html');
            exit;
        }
    }
    
    /**
     * Get current user info
     */
    public static function getCurrentUser() {
        if (isUser()) {
            return [
                'id' => getSession('user_id'),
                'name' => getSession('user_name'),
                'email' => getSession('user_email'),
                'type' => 'user'
            ];
        }
        
        if (isAdmin()) {
            return [
                'id' => getSession('admin_id'),
                'email' => getSession('admin_email'),
                'type' => 'admin'
            ];
        }
        
        return null;
    }
}

// Handle AJAX authentication requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'register':
            $fullName = sanitizeInput($_POST['full_name'] ?? '');
            $phone = sanitizeInput($_POST['phone'] ?? '');
            $email = sanitizeInput($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            
            $result = Auth::registerUser($fullName, $phone, $email, $password);
            echo json_encode($result);
            break;
            
        case 'login':
            $email = sanitizeInput($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            
            $result = Auth::loginUser($email, $password);
            echo json_encode($result);
            break;
            
        case 'admin_login':
            $email = sanitizeInput($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            
            $result = Auth::loginAdmin($email, $password);
            echo json_encode($result);
            break;
            
        case 'logout':
            $result = Auth::logout();
            echo json_encode($result);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}
?>