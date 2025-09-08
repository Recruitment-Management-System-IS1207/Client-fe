<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['user_id'];

// Get database connection
try {
    $db = new Database();
    $conn = $db->getConnection();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Get action from request
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        try {
            // Fetch user profile
            $stmt = $conn->prepare("SELECT full_name, email, phone FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'User not found']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to fetch profile']);
        }
        break;

    case 'update':
        try {
            $fullName = $_POST['fullName'] ?? '';
            $email = $_POST['email'] ?? '';
            $phone = $_POST['phone'] ?? '';
            $newPassword = $_POST['newPassword'] ?? '';

            // Check if email already exists for another user
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $stmt->execute([$email, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => false, 'message' => 'Email already exists']);
                exit;
            }

            // Update query based on whether password is being changed
            if ($newPassword) {
                $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, password = ? WHERE id = ?");
                $success = $stmt->execute([$fullName, $email, $phone, $hashedPassword, $userId]);
            } else {
                $stmt = $conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?");
                $success = $stmt->execute([$fullName, $email, $phone, $userId]);
            }

            if ($success) {
                echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error while updating profile']);
        }
        break;

    case 'delete':
        try {
            // Delete user account
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            
            if ($stmt->execute([$userId])) {
                // Clear session
                session_destroy();
                echo json_encode(['success' => true, 'message' => 'Account deleted successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to delete account']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error while deleting account']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

$conn->close();
?>
