<?php
/**
 * PathFinder Jobs API
 * Handles all job-related operations
 */

require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

class JobsAPI {
    
    /**
     * Get all jobs with optional filtering
     */
    public static function getAllJobs($category = null, $search = null, $limit = null) {
        try {
            $sql = "SELECT j.*, c.name as category_name, c.slug as category_slug 
                    FROM jobs j 
                    LEFT JOIN job_categories c ON j.category_id = c.id 
                    WHERE j.is_active = 1";
            $params = [];
            
            // Add category filter
            if ($category) {
                $sql .= " AND c.slug = ?";
                $params[] = $category;
            }
            
            // Add search filter
            if ($search) {
                $sql .= " AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)";
                $searchTerm = "%$search%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            $sql .= " ORDER BY j.created_at DESC";
            
            // Add limit
            if ($limit) {
                $sql .= " LIMIT ?";
                $params[] = (int)$limit;
            }
            
            $jobs = fetchAll($sql, $params);
            
            // Format salary for display
            foreach ($jobs as &$job) {
                $job['salary_range'] = self::formatSalaryRange($job['salary_min'], $job['salary_max']);
                $job['created_ago'] = self::timeAgo($job['created_at']);
            }
            
            return ['success' => true, 'jobs' => $jobs];
            
        } catch (Exception $e) {
            error_log("Get jobs error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to fetch jobs'];
        }
    }
    
    /**
     * Get single job by ID
     */
    public static function getJob($id) {
        try {
            $sql = "SELECT j.*, c.name as category_name, c.slug as category_slug 
                    FROM jobs j 
                    LEFT JOIN job_categories c ON j.category_id = c.id 
                    WHERE j.id = ? AND j.is_active = 1";
            
            $job = fetchOne($sql, [$id]);
            
            if (!$job) {
                return ['success' => false, 'message' => 'Job not found'];
            }
            
            $job['salary_range'] = self::formatSalaryRange($job['salary_min'], $job['salary_max']);
            $job['created_ago'] = self::timeAgo($job['created_at']);
            
            return ['success' => true, 'job' => $job];
            
        } catch (Exception $e) {
            error_log("Get job error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to fetch job'];
        }
    }
    
    /**
     * Get jobs by category
     */
    public static function getJobsByCategory($categorySlug) {
        return self::getAllJobs($categorySlug);
    }
    
    /**
     * Get job categories
     */
    public static function getCategories() {
        try {
            $categories = fetchAll("SELECT * FROM job_categories ORDER BY name");
            return ['success' => true, 'categories' => $categories];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch categories'];
        }
    }
    
    /**
     * Search jobs
     */
    public static function searchJobs($query) {
        return self::getAllJobs(null, $query);
    }
    
    /**
     * Add new job (Admin only)
     */
    public static function addJob($data) {
        try {
            // Validate required fields
            $required = ['title', 'company', 'location', 'description', 'category_id'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return ['success' => false, 'message' => "Field '$field' is required"];
                }
            }
            
            $sql = "INSERT INTO jobs (title, company, location, description, requirements, 
                    salary_min, salary_max, job_type, category_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                sanitizeInput($data['title']),
                sanitizeInput($data['company']),
                sanitizeInput($data['location']),
                sanitizeInput($data['description']),
                sanitizeInput($data['requirements'] ?? ''),
                $data['salary_min'] ?? null,
                $data['salary_max'] ?? null,
                sanitizeInput($data['job_type'] ?? 'Full-time'),
                (int)$data['category_id']
            ];
            
            $stmt = executeQuery($sql, $params);
            
            if ($stmt) {
                $jobId = getLastInsertId();
                return ['success' => true, 'message' => 'Job created successfully', 'job_id' => $jobId];
            }
            
            return ['success' => false, 'message' => 'Failed to create job'];
            
        } catch (Exception $e) {
            error_log("Add job error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to create job'];
        }
    }
    
    /**
     * Update job (Admin only)
     */
    public static function updateJob($id, $data) {
        try {
            $sql = "UPDATE jobs SET title = ?, company = ?, location = ?, description = ?, 
                    requirements = ?, salary_min = ?, salary_max = ?, job_type = ?, 
                    category_id = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?";
            
            $params = [
                sanitizeInput($data['title']),
                sanitizeInput($data['company']),
                sanitizeInput($data['location']),
                sanitizeInput($data['description']),
                sanitizeInput($data['requirements'] ?? ''),
                $data['salary_min'] ?? null,
                $data['salary_max'] ?? null,
                sanitizeInput($data['job_type'] ?? 'Full-time'),
                (int)$data['category_id'],
                (int)$id
            ];
            
            $stmt = executeQuery($sql, $params);
            
            if ($stmt && $stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Job updated successfully'];
            }
            
            return ['success' => false, 'message' => 'Job not found or no changes made'];
            
        } catch (Exception $e) {
            error_log("Update job error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to update job'];
        }
    }
    
    /**
     * Delete job (Admin only)
     */
    public static function deleteJob($id) {
        try {
            $sql = "UPDATE jobs SET is_active = 0 WHERE id = ?";
            $stmt = executeQuery($sql, [$id]);
            
            if ($stmt && $stmt->rowCount() > 0) {
                return ['success' => true, 'message' => 'Job deleted successfully'];
            }
            
            return ['success' => false, 'message' => 'Job not found'];
            
        } catch (Exception $e) {
            error_log("Delete job error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete job'];
        }
    }
    
    /**
     * Get job statistics
     */
    public static function getJobStats() {
        try {
            $stats = [
                'total_jobs' => fetchOne("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1")['count'],
                'total_applications' => fetchOne("SELECT COUNT(*) as count FROM applications")['count'],
                'jobs_by_category' => fetchAll("SELECT c.name, COUNT(j.id) as count 
                                               FROM job_categories c 
                                               LEFT JOIN jobs j ON c.id = j.category_id AND j.is_active = 1
                                               GROUP BY c.id, c.name"),
                'recent_jobs' => fetchAll("SELECT title, company, created_at FROM jobs 
                                          WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5")
            ];
            
            return ['success' => true, 'stats' => $stats];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Failed to fetch statistics'];
        }
    }
    
    /**
     * Format salary range for display
     */
    private static function formatSalaryRange($min, $max) {
        if (!$min && !$max) return 'Salary not specified';
        if (!$max) return '$' . number_format($min) . '+';
        if (!$min) return 'Up to $' . number_format($max);
        return '$' . number_format($min) . ' - $' . number_format($max);
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
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $category = $_GET['category'] ?? null;
            $search = $_GET['search'] ?? null;
            $limit = $_GET['limit'] ?? null;
            $result = JobsAPI::getAllJobs($category, $search, $limit);
            break;
            
        case 'get':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                $result = ['success' => false, 'message' => 'Job ID required'];
            } else {
                $result = JobsAPI::getJob($id);
            }
            break;
            
        case 'categories':
            $result = JobsAPI::getCategories();
            break;
            
        case 'search':
            $query = $_GET['q'] ?? '';
            $result = JobsAPI::searchJobs($query);
            break;
            
        case 'stats':
            $result = JobsAPI::getJobStats();
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }
    
    echo json_encode($result);
}

// Handle POST requests (Admin only actions)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if user is admin (you'll implement this check)
    // For now, we'll allow all requests
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add':
            $result = JobsAPI::addJob($_POST);
            break;
            
        case 'update':
            $id = $_POST['id'] ?? null;
            if (!$id) {
                $result = ['success' => false, 'message' => 'Job ID required'];
            } else {
                $result = JobsAPI::updateJob($id, $_POST);
            }
            break;
            
        case 'delete':
            $id = $_POST['id'] ?? null;
            if (!$id) {
                $result = ['success' => false, 'message' => 'Job ID required'];
            } else {
                $result = JobsAPI::deleteJob($id);
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }
    
    echo json_encode($result);
}
?>