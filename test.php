<?php
/**
 * Test page to check database connection and setup
 */

require_once 'config/database.php';

echo "<h1>PathFinder Database Test</h1>";

// Test database connection
try {
    $db = getDB();
    echo "<p style='color: green;'> Database connection successful!</p>";
    
    // Test tables exist
    $tables = ['users', 'admins', 'job_categories', 'jobs', 'applications'];
    
    echo "<h3>Database Tables:</h3>";
    foreach ($tables as $table) {
        try {
            $result = executeQuery("SELECT COUNT(*) as count FROM $table");
            $count = $result->fetch()['count'];
            echo "<p style='color: green;'> Table '$table' exists with $count records</p>";
        } catch (Exception $e) {
            echo "<p style='color: red;'> Table '$table' not found or error: " . $e->getMessage() . "</p>";
        }
    }
    
    // Test sample data
    echo "<h3>Sample Jobs:</h3>";
    $jobs = fetchAll("SELECT title, company, location FROM jobs LIMIT 3");
    if (!empty($jobs)) {
        foreach ($jobs as $job) {
            echo "<p>• " . htmlspecialchars($job['title']) . " at " . htmlspecialchars($job['company']) . " (" . htmlspecialchars($job['location']) . ")</p>";
        }
    } else {
        echo "<p style='color: orange;'> No sample jobs found. Run the database setup script.</p>";
    }
    
    // Test admin account
    echo "<h3>Admin Account:</h3>";
    $admin = fetchOne("SELECT email FROM admins LIMIT 1");
    if ($admin) {
        echo "<p style='color: green;'> Admin account exists: " . htmlspecialchars($admin['email']) . "</p>";
        echo "<p><strong>Default password:</strong> password</p>";
    } else {
        echo "<p style='color: orange;'> No admin account found. Run the database setup script.</p>";
    }
    
    // Test file upload directory
    $uploadDir = 'uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
        mkdir($uploadDir . 'cvs/', 0777, true);
        mkdir($uploadDir . 'motivation_letters/', 0777, true);
        echo "<p style='color: green;'> Upload directories created</p>";
    } else {
        echo "<p style='color: green;'> Upload directories exist</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'> Database connection failed: " . $e->getMessage() . "</p>";
    echo "<p>Make sure XAMPP is running and the database is created.</p>";
}

echo "<h3>Next Steps:</h3>";
echo "<ol>";
echo "<li>If database connection failed, start XAMPP and create the database using the SQL script</li>";
echo "<li>Test signup by going to <a href='Pages/auth/signup.html'>Pages/auth/signup.html</a></li>";
echo "<li>Test login by going to <a href='Pages/auth/signin.html'>Pages/auth/signin.html</a></li>";
echo "<li>Use admin email: admin@pathfinder.com, password: password for admin login</li>";
echo "</ol>";

echo "<style>
body { font-family: Arial, sans-serif; margin: 40px; }
h1, h3 { color: #2c3e50; }
p { margin: 8px 0; }
ol { margin: 20px 0; }
</style>";
?>