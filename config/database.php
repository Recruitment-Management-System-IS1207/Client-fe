<?php
/**
 * Simple PathFinder Database Configuration
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'pathfinder_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// Simple database connection
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch(PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    return $pdo;
}

// Helper function to execute queries safely
function executeQuery($sql, $params = []) {
    try {
        $db = getDB();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch(PDOException $e) {
        error_log("Query error: " . $e->getMessage());
        return false;
    }
}

// Helper function to fetch single row
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetch() : false;
}

// Helper function to fetch multiple rows
function fetchAll($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetchAll() : [];
}

// Helper function to get last insert ID
function getLastInsertId() {
    return getDB()->lastInsertId();
}

// Helper function for secure password hashing
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Helper function for password verification
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Helper function to sanitize input
function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

// Helper function to validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Helper functions for session management
function setSession($key, $value) {
    $_SESSION[$key] = $value;
}

function getSession($key, $default = null) {
    return $_SESSION[$key] ?? $default;
}

function destroySession() {
    session_destroy();
    session_start();
}

function isLoggedIn() {
    return isset($_SESSION['user_id']) || isset($_SESSION['admin_id']);
}

function isAdmin() {
    return isset($_SESSION['admin_id']);
}

function isUser() {
    return isset($_SESSION['user_id']);
}

// Helper function for file uploads
function uploadFile($file, $targetDir, $allowedTypes = ['pdf', 'doc', 'docx']) {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }
    
    $fileName = $file['name'];
    $fileType = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    if (!in_array($fileType, $allowedTypes)) {
        return false;
    }
    
    $uniqueName = uniqid() . '_' . time() . '.' . $fileType;
    $targetPath = $targetDir . $uniqueName;
    
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return $uniqueName;
    }
    
    return false;
}

// Error and success message handling
function setMessage($message, $type = 'success') {
    $_SESSION['message'] = $message;
    $_SESSION['message_type'] = $type;
}

function getMessage() {
    if (isset($_SESSION['message'])) {
        $message = $_SESSION['message'];
        $type = $_SESSION['message_type'] ?? 'success';
        unset($_SESSION['message'], $_SESSION['message_type']);
        return ['message' => $message, 'type' => $type];
    }
    return null;
}

// Set timezone
date_default_timezone_set('America/New_York');

?>