<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
require_once __DIR__ . '/security.php';
security_start_session();
security_validate_same_origin(security_allowed_origins());
require_once 'db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

security_validate_csrf();

$user_id = $_SESSION['user_id'];
if (!security_rate_limit('avatar_upload_' . $user_id, 10, 3600)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many avatar uploads. Please try again later.']);
    exit;
}

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded or upload error.']);
    exit;
}

$fileTmpPath = $_FILES['avatar']['tmp_name'];
$fileSize = $_FILES['avatar']['size'];

// Max 5MB
if ($fileSize <= 0 || $fileSize > 5 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'File size exceeds 5MB limit.']);
    exit;
}

$imageInfo = @getimagesize($fileTmpPath);
if (!$imageInfo || empty($imageInfo['mime'])) {
    echo json_encode(['success' => false, 'error' => 'Upload failed. File is not a valid image.']);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$detectedMime = $finfo->file($fileTmpPath);
$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp'
];

if (!isset($allowedMimeTypes[$detectedMime]) || $imageInfo['mime'] !== $detectedMime) {
    echo json_encode(['success' => false, 'error' => 'Upload failed. Allowed image types: jpg, png, webp.']);
    exit;
}

[$width, $height] = $imageInfo;
if ($width < 1 || $height < 1 || $width > 4096 || $height > 4096) {
    echo json_encode(['success' => false, 'error' => 'Image dimensions are not allowed.']);
    exit;
}

$uploadFileDir = './avatars/';
if (!is_dir($uploadFileDir)) {
    mkdir($uploadFileDir, 0755, true);
}

$avatarHtaccess = $uploadFileDir . '.htaccess';
if (!file_exists($avatarHtaccess)) {
    file_put_contents($avatarHtaccess, "<FilesMatch \"\\.(php|phtml|phar|cgi|pl|sh)$\">\nRequire all denied\n</FilesMatch>\nOptions -Indexes\n");
}

$fileExtension = $allowedMimeTypes[$detectedMime];
$newFileName = bin2hex(random_bytes(16)) . '.' . $fileExtension;
$dest_path = $uploadFileDir . $newFileName;

if (move_uploaded_file($fileTmpPath, $dest_path)) {
    try {
        $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
        $stmt->execute([$newFileName, $user_id]);

        if ($stmt->rowCount() < 1) {
            @unlink($dest_path);
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'avatar' => $newFileName]);
    } catch (PDOException $e) {
        @unlink($dest_path);
        error_log('Avatar database update failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Avatar upload failed. Please try again later.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'There was an error moving the uploaded file.']);
}
