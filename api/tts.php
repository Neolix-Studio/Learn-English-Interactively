<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// --- 1. CONFIGURATION ---
// Put your Google Cloud API key here
// NEVER HARDCODE THIS IN PUBLIC REPOS. Use environment variables!
$googleApiKey = getenv('GOOGLE_TTS_API_KEY') ?: 'YOUR_GOOGLE_CLOUD_API_KEY_HERE';

// Put your WebSupport Database details here
$dbHost = 'localhost'; // Usually localhost or a specific host provided by WebSupport
$dbUser = 'your_db_username';
$dbPass = 'your_db_password';
$dbName = 'your_db_name';

// --- 2. INPUT VALIDATION ---
$text = isset($_GET['text']) ? trim($_GET['text']) : '';

if (empty($text)) {
    echo json_encode(['error' => 'No text provided.']);
    exit;
}

// Generate a unique hash for this exact text to easily look it up in the database
$textHash = hash('sha256', $text);

// --- 3. DATABASE CONNECTION ---
try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// --- 4. CHECK CACHE IN DATABASE ---
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

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['error' => 'Google TTS API failed', 'details' => json_decode($response)]);
    exit;
}

$responseData = json_decode($response, true);
if (!isset($responseData['audioContent'])) {
    echo json_encode(['error' => 'No audio content received from Google']);
    exit;
}

// --- 6. SAVE AUDIO FILE ---
$audioContent = base64_decode($responseData['audioContent']);
$filename = $textHash . '.mp3';
$audioDir = __DIR__ . '/../audio';
$filePath = $audioDir . '/' . $filename;

// Ensure the audio directory exists
if (!is_dir($audioDir)) {
    mkdir($audioDir, 0755, true);
}

if (!file_put_contents($filePath, $audioContent)) {
    echo json_encode(['error' => 'Failed to save audio file to server. Check folder permissions.']);
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
