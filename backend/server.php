<?php
/**
 * Calendar Photo Converter - Simple PHP Server
 * A lightweight PHP server for serving the frontend application.
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration
$port = isset($_SERVER['SERVER_PORT']) ? $_SERVER['SERVER_PORT'] : 8000;
$frontend_dir = __DIR__ . '/frontend';

// Check if we're running via built-in server
if (php_sapi_name() === 'cli-server') {
    $request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    // Handle static files
    if ($request_uri !== '/' && $request_uri !== '') {
        $file_path = $frontend_dir . $request_uri;
        
        // Serve static files if they exist
        if (is_file($file_path)) {
            return false; // Let PHP's built-in server handle static files
        }
        
        // Handle API endpoints
        if (strpos($request_uri, '/api/') === 0) {
            handleApiRequest($request_uri);
            return true;
        }
    }
    
    // Serve index.html for root requests
    $index_file = $frontend_dir . '/index.html';
    if (file_exists($index_file)) {
        readfile($index_file);
        return true;
    } else {
        http_response_code(404);
        echo "<h1>Frontend files not found</h1>";
        echo "<p>Please make sure the frontend directory exists at: {$frontend_dir}</p>";
        echo "<p>Expected files: index.html, styles.css, app.js</p>";
        return true;
    }
}

/**
 * Handle API requests
 */
function handleApiRequest($path) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    // Handle preflight OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        return;
    }
    
    $response = array('status' => 'error', 'message' => 'Unknown endpoint');
    
    switch ($path) {
        case '/api/status':
            $response = array(
                'status' => 'running',
                'message' => 'Calendar Photo Converter PHP server is running',
                'timestamp' => date('c'),
                'php_version' => phpversion()
            );
            break;
            
        case '/api/process-images':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $response = handleImageProcessing();
            } else {
                $response = array('status' => 'error', 'message' => 'POST method required');
            }
            break;
            
        case '/api/auth/google':
            $response = array(
                'status' => 'success',
                'message' => 'Google OAuth would be implemented here',
                'auth_url' => 'https://accounts.google.com/oauth2/auth'
            );
            break;
            
        case '/api/calendar/add-events':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $events = isset($input['events']) ? $input['events'] : array();
                
                $response = array(
                    'status' => 'success',
                    'message' => 'Successfully added ' . count($events) . ' events to calendar',
                    'events_added' => count($events)
                );
            } else {
                $response = array('status' => 'error', 'message' => 'POST method required');
            }
            break;
    }
    
    if ($response['status'] === 'error') {
        http_response_code(400);
    }
    
    echo json_encode($response);
}

/**
 * Handle image processing (mock implementation)
 */
function handleImageProcessing() {
    if (!isset($_FILES['images']) || empty($_FILES['images']['name'][0])) {
        return array('status' => 'error', 'message' => 'No images uploaded');
    }
    
    $uploaded_files = $_FILES['images'];
    $file_count = count($uploaded_files['name']);
    
    // Generate mock events
    $event_templates = array(
        array(
            'title' => 'Team Meeting',
            'date' => '2024-01-15',
            'time' => '10:00 AM',
            'description' => 'Weekly team sync and project updates'
        ),
        array(
            'title' => 'Doctor Appointment',
            'date' => '2024-01-16',
            'time' => '2:30 PM',
            'description' => 'Annual check-up with Dr. Smith'
        ),
        array(
            'title' => 'Birthday Party',
            'date' => '2024-01-18',
            'time' => '7:00 PM',
            'description' => 'Sarah\'s surprise birthday celebration'
        ),
        array(
            'title' => 'Conference Call',
            'date' => '2024-01-20',
            'time' => '11:00 AM',
            'description' => 'Client presentation and Q&A session'
        )
    );
    
    $events = array();
    for ($i = 0; $i < $file_count; $i++) {
        $filename = $uploaded_files['name'][$i];
        $num_events = rand(1, 3);
        
        for ($j = 0; $j < $num_events; $j++) {
            $template = $event_templates[array_rand($event_templates)];
            $template['id'] = uniqid() . '-' . $i . '-' . $j;
            $template['sourceImage'] = $filename;
            $template['confidence'] = rand(70, 100);
            $events[] = $template;
        }
    }
    
    return array(
        'status' => 'success',
        'message' => 'Processed ' . $file_count . ' images',
        'events' => $events,
        'images_processed' => $file_count
    );
}

// If running as a standalone script, provide instructions
if (php_sapi_name() === 'cli' && isset($argv[0]) && basename($argv[0]) === 'server.php') {
    $frontend_dir = __DIR__ . '/frontend';
    
    echo "📁 Checking frontend directory: {$frontend_dir}\n";
    
    if (!is_dir($frontend_dir)) {
        echo "❌ Error: Frontend directory not found!\n";
        echo "Please make sure the frontend directory exists with index.html, styles.css, and app.js\n";
        exit(1);
    }
    
    $required_files = ['index.html', 'styles.css', 'app.js'];
    $missing_files = array();
    
    foreach ($required_files as $file) {
        if (!file_exists($frontend_dir . '/' . $file)) {
            $missing_files[] = $file;
        }
    }
    
    if (!empty($missing_files)) {
        echo "⚠️  Warning: Missing frontend files: " . implode(', ', $missing_files) . "\n";
    }
    
    $port = 8000;
    $server_url = "http://localhost:{$port}";
    
    echo "=" . str_repeat('=', 59) . "\n";
    echo "🚀 Calendar Photo Converter PHP Server Starting...\n";
    echo "=" . str_repeat('=', 59) . "\n";
    echo "✅ Server will run at: {$server_url}\n";
    echo "📁 Serving files from: {$frontend_dir}\n";
    echo "🌐 Open in browser: {$server_url}\n";
    echo "=" . str_repeat('=', 59) . "\n";
    echo "Starting PHP built-in server...\n";
    echo "🛑 Press Ctrl+C to stop the server\n";
    echo "=" . str_repeat('=', 59) . "\n";
    
    // Start the PHP built-in server
    $command = "php -S localhost:{$port} -t " . escapeshellarg($frontend_dir) . " " . escapeshellarg(__FILE__);
    
    // Try to open browser after starting server
    if (PHP_OS_FAMILY === 'Darwin') {
        $open_command = "sleep 2 && open {$server_url} > /dev/null 2>&1 &";
    } elseif (PHP_OS_FAMILY === 'Windows') {
        $open_command = "timeout 2 > nul && start {$server_url}";
    } else {
        $open_command = "sleep 2 && xdg-open {$server_url} > /dev/null 2>&1 &";
    }
    
    // Start browser opener in background
    exec($open_command);
    
    // Start the server
    passthru($command);
}
?>