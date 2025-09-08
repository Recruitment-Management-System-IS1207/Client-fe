<?php
/**
 * PathFinder Applications API
 * Handles job application submissions and management
 */

require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

class ApplicationsAPI {
    
    /**
     * Submit a job application
     */
    public static function submitApplication($jobId, $data, $files) {
        try {
            // Validate required fields
            $required = ['full_name', 'address', 'phone', 'email', 'additional_info'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return ['success' => false, 'message' => "Field '$field' is required"];
                }
            }
            
            // Validate email
            if (!isValidEmail($data['email'])) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }
            
            // Check if job exists
            $job = fetchOne("SELECT id, title FROM jobs WHERE id = ? AND is_active = 1", [$jobId]);
            if (!$job) {
                return ['success' => false, 'message' => 'Job not found'];
            }
            
            // Handle file uploads
            $cvFileName = null;
            $motivationFileName = null;
            
            // Upload CV file
            if (isset($files['cv']) && $files['cv']['error'] === UPLOAD_ERR_OK) {
                $cvFileName = self::uploadApplicationFile($files['cv'], 'cv');
                if (!$cvFileName) {
                    return ['success' => false, 'message' => 'Failed to upload CV file'];
                }
            } else {
                return ['success' => false, 'message' => 'CV file is required'];
            }
            
            // Upload motivation letter
            if (isset($files['motivation']) && $files['motivation']['error'] === UPLOAD_ERR_OK) {
                $motivationFileName = self::uploadApplicationFile($files['motivation'], 'motivation');
                if (!$motivationFileName) {
                    // Clean up CV file if motivation upload fails
                    if ($cvFileName) {
                        unlink('../uploads/cvs/' . $cvFileName);
                    }
                    return ['success' => false, 'message' => 'Failed to upload motivation letter'];
                }
            } else {
                return ['success' => false, 'message' => 'Motivation letter is required'];
            }
            
            // Get user ID if logged in
            $userId = getSession('user_id', null);
            
            // Insert application
            $sql = "INSERT INTO applications (job_id, user_id, full_name, address, phone, email, 
                    cv_file, motivation_file, additional_info) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $jobId,
                $userId,
                sanitizeInput($data['full_name']),
                sanitizeInput($data['address']),
                sanitizeInput($data['phone']),
                sanitizeInput($data['email']),
                $cvFileName,
                $motivationFileName,
                sanitizeInput($data['additional_info'])
            ];
            
            $stmt = executeQuery($sql, $params);
            
            if ($stmt) {
                $applicationId = getLastInsertId();
                
                // Send email notification (you can implement this later)
                // self::sendApplicationNotification($applicationId);
                
                return [
                    'success' => true, 
                    'message' => 'Application submitted successfully',
                    'application_id' => $applicationId
                ];
            }
            
            return ['success' => false, 'message' => 'Failed to submit application'];
            
        } catch (Exception $e) {
            error_log("Submit application error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to submit application'];
        }
    }
    
    /**
     * Get applications for a job (Admin only)
     */
    public static function getJobApplications($jobId) {
        try {
            $sql = "SELECT a.*, j.title as job_title, j.company 
                    FROM applications a 
                    JOIN jobs j ON a.job_id = j.id 
                    WHERE a.job_id = ? 
                    ORDER BY a.applied_at DESC";
            
            $applications = fetchAll($sql, [$jobId]);
            
            // Format data for display
            foreach ($applications as &$app) {
                $app['applied_ago'] = self::timeAgo($app['applied_at']);
                $app['status_label'] = ucfirst($app['status']);
            }
            
            return ['success' => true, 'applications' => $applications];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch applications'];
        }
    }
    
    /**
     * Get all applications (Admin only)
     */
    public static function getAllApplications($status = null, $limit = null) {
        try {
            $sql = "SELECT a.*, j.title as job_title, j.company 
                    FROM applications a 
                    JOIN jobs j ON a.job_id = j.id";
            $params = [];
            
            if ($status) {
                $sql .= " WHERE a.status = ?";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY a.applied_at DESC";
            
            if ($limit) {
                $sql .= " LIMIT ?";
                $params[] = (int)$limit;
            }
            
            $applications = fetchAll($sql, $params);
            
            foreach ($applications as &$app) {
                $app['applied_ago'] = self::timeAgo($app['applied_at']);
                $app['status_label'] = ucfirst($app['status']);
            }
            
            return ['success' => true, 'applications' => $applications];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch applications'];
        }
    }
    
    /**
     * Get single application (Admin only)
     */
    public static function getApplication($id) {
        try {
            $sql = "SELECT a.*, j.title as job_title, j.company, j.location 
                    FROM applications a 
                    JOIN jobs j ON a.job_id = j.id 
                    WHERE a.id = ?";
            
            $application = fetchOne($sql, [$id]);
            
            if (!$application) {
                return ['success' => false, 'message' => 'Application not found'];
            }
            
            $application['applied_ago'] = self::timeAgo($application['applied_at']);
            $application['status_label'] = ucfirst($application['status']);
            
            return ['success' => true, 'application' => $application];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch application'];
        }
    }
    
    /**
     * Update application status (Admin only)
     */
    public static function updateApplicationStatus($id, $status) {
        try {
            $validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
            if (!in_array($status, $validStatuses)) {
                return ['success' => false, 'message' => 'Invalid status'];
            }
            
            $sql = "UPDATE applications SET status = ? WHERE id = ?";
            $stmt = executeQuery($sql, [$status, $id]);
            
            if ($stmt && $stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Application status updated'];
            }
            
            return ['success' => false, 'message' => 'Application not found'];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to update status'];
        }
    }
    
    /**
     * Get user's applications
     */
    public static function getUserApplications($userId) {
        try {
            $sql = "SELECT a.*, j.title as job_title, j.company, j.location 
                    FROM applications a 
                    JOIN jobs j ON a.job_id = j.id 
                    WHERE a.user_id = ? 
                    ORDER BY a.applied_at DESC";
            
            $applications = fetchAll($sql, [$userId]);
            
            foreach ($applications as &$app) {
                $app['applied_ago'] = self::timeAgo($app['applied_at']);
                $app['status_label'] = ucfirst($app['status']);
                $app['status_color'] = self::getStatusColor($app['status']);
            }
            
            return ['success' => true, 'applications' => $applications];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch applications'];
        }
    }
    
    /**
     * Get application statistics
     */
    public static function getApplicationStats() {
        try {
            $stats = [
                'total_applications' => fetchOne("SELECT COUNT(*) as count FROM applications")['count'],
                'pending_applications' => fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'")['count'],
                'reviewed_applications' => fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'reviewed'")['count'],
                'hired_applications' => fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'hired'")['count'],
                'applications_by_status' => fetchAll("SELECT status, COUNT(*) as count FROM applications GROUP BY status"),
                'recent_applications' => fetchAll("SELECT a.full_name, j.title, a.applied_at 
                                                  FROM applications a 
                                                  JOIN jobs j ON a.job_id = j.id 
                                                  ORDER BY a.applied_at DESC LIMIT 5")
            ];
            
            return ['success' => true, 'stats' => $stats];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch statistics'];
        }
    }
    
    /**
     * Upload application file
     */
    private static function uploadApplicationFile($file, $type) {
        $uploadDir = '../uploads/' . ($type === 'cv' ? 'cvs/' : 'motivation_letters/');
        
        // Create directory if it doesn't exist
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        return uploadFile($file, $uploadDir, ['pdf', 'doc', 'docx']);
    }
    
    /**
     * Get status color for UI
     */
    private static function getStatusColor($status) {
        $colors = [
            'pending' => 'orange',
            'reviewed' => 'blue',
            'shortlisted' => 'green',
            'rejected' => 'red',
            'hired' => 'purple'
        ];
        return $colors[$status] ?? 'gray';
    }
    
    /**
     * Calculate time ago
     */
    private static function timeAgo($datetime) {
        $time = time() - strtotime($datetime);
        
        if ($time < 60) return 'just now';
        if ($time < 3600) return floor($time/60) . ' minutes ago';
        if ($time < 86400) return floor($time/3600) . ' hours ago';
        if ($time < 2592000) return floor($time/86400) . ' days ago';
        if ($time < 31104000) return floor($time/2592000) . ' months ago';
        return floor($time/31104000) . ' years ago';
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'submit':
            $jobId = $_POST['job_id'] ?? null;
            if (!$jobId) {
                echo json_encode(['success' => false, 'message' => 'Job ID required']);
            } else {
                $result = ApplicationsAPI::submitApplication($jobId, $_POST, $_FILES);
                echo json_encode($result);
            }
            break;
            
        case 'update_status':
            $id = $_POST['id'] ?? null;
            $status = $_POST['status'] ?? null;
            if (!$id || !$status) {
                echo json_encode(['success' => false, 'message' => 'Application ID and status required']);
            } else {
                $result = ApplicationsAPI::updateApplicationStatus($id, $status);
                echo json_encode($result);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $status = $_GET['status'] ?? null;
            $limit = $_GET['limit'] ?? null;
            $result = ApplicationsAPI::getAllApplications($status, $limit);
            break;
            
        case 'job':
            $jobId = $_GET['job_id'] ?? null;
            if (!$jobId) {
                $result = ['success' => false, 'message' => 'Job ID required'];
            } else {
                $result = ApplicationsAPI::getJobApplications($jobId);
            }
            break;
            
        case 'get':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                $result = ['success' => false, 'message' => 'Application ID required'];
            } else {
                $result = ApplicationsAPI::getApplication($id);
            }
            break;
            
        case 'user':
            $userId = $_GET['user_id'] ?? getSession('user_id');
            if (!$userId) {
                $result = ['success' => false, 'message' => 'User not logged in'];
            } else {
                $result = ApplicationsAPI::getUserApplications($userId);
            }
            break;
            
        case 'stats':
            $result = ApplicationsAPI::getApplicationStats();
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }
    
    echo json_encode($result);
}
?>