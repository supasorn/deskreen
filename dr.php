<?php
/**
 * Deskreen URL Redirector
 * 
 * Usage:
 * - Save URL: dr.php?url=http://192.168.1.100:3131/123456
 * - Redirect to saved URL: dr.php
 * 
 * Optional parameters when saving:
 * - dr.php?ip=192.168.1.100&port=3131&room=123456
 */

// Configuration
$dataFile = __DIR__ . '/deskreen_url.txt';
$maxAge = 3600; // URL expires after 1 hour (in seconds)

// Helper function to validate URL
function isValidUrl($url) {
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

// Helper function to build URL from components
function buildUrl($ip, $port, $room) {
    // Validate IP
    if (!filter_var($ip, FILTER_VALIDATE_IP) && !filter_var(gethostbyname($ip), FILTER_VALIDATE_IP)) {
        return null;
    }
    
    // Validate port
    $port = intval($port);
    if ($port < 1 || $port > 65535) {
        return null;
    }
    
    // Build URL
    return "http://{$ip}:{$port}/{$room}";
}

// Handle saving URL
if (isset($_GET['url']) || (isset($_GET['ip']) && isset($_GET['port']) && isset($_GET['room']))) {
    
    // Build URL from components if provided
    if (isset($_GET['ip']) && isset($_GET['port']) && isset($_GET['room'])) {
        $url = buildUrl($_GET['ip'], $_GET['port'], $_GET['room']);
        if ($url === null) {
            http_response_code(400);
            die('Invalid IP, port, or room parameters');
        }
    } else {
        $url = $_GET['url'];
        
        // Validate URL
        if (!isValidUrl($url)) {
            http_response_code(400);
            die('Invalid URL provided');
        }
    }
    
    // Save URL with timestamp
    $data = [
        'url' => $url,
        'timestamp' => time()
    ];
    
    if (file_put_contents($dataFile, json_encode($data)) === false) {
        http_response_code(500);
        die('Failed to save URL');
    }
    
    // Return success response
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'url' => $url,
        'message' => 'URL saved successfully'
    ]);
    exit;
}

if (isset($_GET['clear'])) {
    if (file_exists($dataFile)) {
        unlink($dataFile);
    }
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Saved URL cleared'
    ]);
    exit;
}

// Handle redirect to saved URL
if (file_exists($dataFile)) {
    $content = file_get_contents($dataFile);
    $data = json_decode($content, true);
    
    if ($data && isset($data['url']) && isset($data['timestamp'])) {
        $age = time() - $data['timestamp'];
        
        // Check if URL has expired
        if ($age > $maxAge) {
            http_response_code(410);
            die('Saved URL has expired. Please generate a new connection.');
        }
        
        // Redirect to saved URL
        header('Location: ' . $data['url']);
        exit;
    }
}

// No saved URL found
http_response_code(404);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Deskreen Redirector</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 48px;
            margin: 0 0 20px 0;
        }
        p {
            font-size: 18px;
            opacity: 0.9;
        }
        .icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🖥️</div>
        <h1>No Active Deskreen Session</h1>
        <p>Please start Deskreen on your computer to create a new connection.</p>
        <p style="font-size: 14px; margin-top: 30px; opacity: 0.7;">
            This link will automatically redirect to your Deskreen session when available.
        </p>
    </div>
</body>
</html>
