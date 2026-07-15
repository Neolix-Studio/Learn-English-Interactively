<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../security.php';
security_start_session();

// Suppress PHP warnings from breaking the JSON output
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING & ~E_NOTICE);

// Include WebSupport Database details from db_config.php
require_once __DIR__ . '/../db_config.php';
$dbHost = DB_HOST;
$dbUser = DB_USER;
$dbPass = DB_PASS;
$dbName = DB_NAME;

// --- 1. CONFIGURATION ---
$googleApiKey = getenv('GOOGLE_TTS_API_KEY') ?: (defined('GOOGLE_TTS_API_KEY') ? GOOGLE_TTS_API_KEY : '');
if (!$googleApiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Text-to-speech service is not configured.']);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && !in_array($origin, security_allowed_origins(), true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid request origin.']);
    exit;
}

$fetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
if ($fetchSite && !in_array($fetchSite, ['same-origin', 'same-site', 'none'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Cross-site request blocked.']);
    exit;
}

// --- 2. INPUT VALIDATION ---
$text = isset($_GET['text']) ? trim($_GET['text']) : '';

if (empty($text)) {
    echo json_encode(['error' => 'No text provided.']);
    exit;
}

if (mb_strlen($text) > 300) {
    http_response_code(400);
    echo json_encode(['error' => 'Text is too long.']);
    exit;
}

// Generate a unique hash (MD5 creates a 32-character string which avoids 'Data too long' SQL errors)
$textHash = md5($text);

// --- 3. DATABASE CONNECTION ---
try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log('TTS database connection failed: ' . security_sanitize_log_line($e->getMessage()));
    http_response_code(500);
    echo json_encode(['error' => 'Text-to-speech service is temporarily unavailable.']);
    exit;
}

// --- 4. CHECK CACHE IN DATABASE ---
// Ensure the cache table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS tts_cache (
    text_hash VARCHAR(32) PRIMARY KEY,
    text TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

// We check if we already generated this exact text before.
$stmt = $pdo->prepare("SELECT filename FROM tts_cache WHERE text_hash = :hash LIMIT 1");
$stmt->execute(['hash' => $textHash]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if ($row && !empty($row['filename'])) {
    $fileUrl = '/audio/' . $row['filename'];
    if (file_exists(__DIR__ . '/../audio/' . $row['filename'])) {
        // Return existing cached file!
        echo json_encode(['success' => true, 'url' => $fileUrl, 'cached' => true]);
        exit;
    }
}

if (!security_rate_limit('tts_' . ($_SERVER['REMOTE_ADDR'] ?? session_id()), 30, 3600)) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many text-to-speech requests. Please try again later.']);
    exit;
}

// --- 5. CALL GOOGLE CLOUD TTS API ---
// If we are here, it means we don't have the audio yet! We must generate it.
$url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" . $googleApiKey;

// Payload for high-quality Journey voice (one of Google's best natural voices)
$data = [
    'input' => ['text' => $text],
    'voice' => [
        'languageCode' => 'en-US',
        // 'en-US-Journey-F' is a very high quality, expressive premium voice
        'name' => 'en-US-Journey-F'
    ],
    'audioConfig' => [
        'audioEncoding' => 'MP3',
        'speakingRate' => 0.85 // Slightly slower for language learners
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
// curl_close is deprecated in PHP 8.5+ and no longer needed

if ($response === false || $httpCode !== 200) {
    error_log('Google TTS API failed: http=' . $httpCode . ' curl=' . security_sanitize_log_line($curlError));
    http_response_code(502);
    echo json_encode(['error' => 'Generated audio is temporarily unavailable.']);
    exit;
}

$responseData = json_decode($response, true);
if (!isset($responseData['audioContent'])) {
    error_log('Google TTS API response missing audioContent.');
    http_response_code(502);
    echo json_encode(['error' => 'Generated audio is temporarily unavailable.']);
    exit;
}

// --- 6. SAVE AUDIO FILE ---
$audioContent = base64_decode($responseData['audioContent']);
$filename = $textHash . '.mp3';
$audioDir = __DIR__ . '/../audio';
$filePath = $audioDir . '/' . $filename;

// Ensure the audio directory exists
if (!is_dir($audioDir)) {
    if (!mkdir($audioDir, 0755, true) && !is_dir($audioDir)) {
        error_log('TTS audio directory could not be created.');
        http_response_code(500);
        echo json_encode(['error' => 'Generated audio is temporarily unavailable.']);
        exit;
    }
}

if (!file_put_contents($filePath, $audioContent)) {
    error_log('TTS audio file could not be saved.');
    http_response_code(500);
    echo json_encode(['error' => 'Generated audio is temporarily unavailable.']);
    exit;
}

// --- 7. SAVE TO DATABASE CACHE ---
$stmt = $pdo->prepare("INSERT INTO tts_cache (text_hash, text, filename) VALUES (:hash, :text, :filename) ON DUPLICATE KEY UPDATE filename=:filename");
$stmt->execute([
    'hash' => $textHash,
    'text' => $text,
    'filename' => $filename
]);

// Return new file link
echo json_encode(['success' => true, 'url' => '/audio/' . $filename, 'cached' => false]);
