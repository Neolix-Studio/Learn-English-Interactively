<?php
$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/security.php';
set_time_limit(900);

require_once $projectRoot . '/db_config.php';
security_require_cli_or_token();

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

$output = "<h1>Simulation & Pre-caching Report</h1><hr>";

$output .= "<h2>1. Simulating 500 Bots</h2>";

$botPrefix = "bot";
$botsToCreate = 500;

try {
    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email LIKE ?");
    $stmtCheck->execute([$botPrefix . '%@lexipaws.local']);
    $existingBots = $stmtCheck->fetchColumn();

    if ($existingBots < $botsToCreate) {
        $botsToGenerate = $botsToCreate - $existingBots;
        $output .= "<p>Generating $botsToGenerate new bots...</p>";

        $passwordHash = password_hash("botpassword", PASSWORD_DEFAULT);

        $adjectives = ['Cool', 'Happy', 'Fast', 'Smart', 'Lucky', 'Brave', 'Clever', 'Super', 'Epic', 'Ninja', 'Pro', 'Sleepy', 'Fierce', 'Mighty', 'Swift', 'Wild'];
        $nouns = ['Panda', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Lion', 'Gamer', 'Student', 'Learner', 'Hero', 'Dragon', 'Shark', 'Hawk', 'Rhino'];
        $names = ['Alex', 'David', 'Sarah', 'Emma', 'Tom', 'John', 'Anna', 'Lucas', 'Mia', 'Oliver', 'Sophie', 'Max', 'Leo', 'Zoe', 'Eva'];

        for ($i = 0; $i < $botsToGenerate; $i++) {
            $botNum = $existingBots + $i + 1;

            $success = false;
            $attempts = 0;
            $userId = null;

            while (!$success && $attempts < 10) {
            $type = mt_rand(1, 4);
            if ($type === 1) {
                $username = $adjectives[array_rand($adjectives)] . $nouns[array_rand($nouns)];
            } else if ($type === 2) {
                $username = $names[array_rand($names)] . mt_rand(1, 99);
            } else if ($type === 3) {
                $username = $names[array_rand($names)] . '_' . $nouns[array_rand($nouns)];
            } else {
                $username = $names[array_rand($names)] . mt_rand(80, 99);
            }

                $email = "bot" . $botNum . "@lexipaws.local";

                try {
                    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, username, age_range) VALUES (?, ?, ?, 'unknown')");
                    $stmt->execute([$email, $passwordHash, $username]);
                    $userId = $pdo->lastInsertId();
                    $success = true;
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) {
                        $attempts++;
                    } else {
                        throw $e;
                    }
                }
            }

            $stmtSub = $pdo->prepare("INSERT INTO user_subscriptions (user_id, role, subscription_tier) VALUES (?, 'user', 'free')");
            $stmtSub->execute([$userId]);

            $rand = mt_rand(1, 100);
            if ($rand <= 50) $points = mt_rand(50, 499);
            elseif ($rand <= 80) $points = mt_rand(500, 1499);
            elseif ($rand <= 95) $points = mt_rand(1500, 4999);
            else $points = mt_rand(5000, 12000);

            $stmtProg = $pdo->prepare("INSERT INTO user_progress (user_id, points, completed, scores, level, streak_count, streak_shields, active_theme) VALUES (?, ?, '{}', '{}', 1, ?, 2, 'system')");
            $stmtProg->execute([$userId, $points, mt_rand(0, 15)]);

            $leagueId = 1;
            if ($points >= 5000) $leagueId = 4;
            elseif ($points >= 1500) $leagueId = 3;
            elseif ($points >= 500) $leagueId = 2;

            $stmtLeague = $pdo->prepare("INSERT INTO user_leagues (user_id, league_id, weekly_xp, monthly_xp) VALUES (?, ?, ?, ?)");
            $stmtLeague->execute([$userId, $leagueId, mt_rand(0, $points), $points]);
        }

        $pdo->commit();
        $output .= "<p>✅ Successfully generated bots and populated leaderboards!</p>";
    } else {
        $pdo->rollBack();
        $output .= "<p>✅ Bots already exist. Skipping generation to prevent database bloat.</p>";
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $output .= "<p>❌ Error generating bots: " . $e->getMessage() . "</p>";
}

$output .= "<h2>2. Pre-caching TTS Audio</h2>";

$dataDir = $projectRoot . '/data';
if (!is_dir($dataDir)) {
    $output .= "<p>❌ Error: /data directory not found.</p>";
    echo $output;
    exit;
}

$pdo->exec("CREATE TABLE IF NOT EXISTS tts_cache (
    text_hash VARCHAR(32) PRIMARY KEY,
    text TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

function getJsonFiles($dir) {
    $files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'json') {
            $files[] = $file->getPathname();
        }
    }
    return $files;
}

$jsonFiles = getJsonFiles($dataDir);
$output .= "<p>Found " . count($jsonFiles) . " JSON files. Scanning for English text...</p>";

$textsToGenerate = [];

foreach ($jsonFiles as $file) {
    $content = file_get_contents($file);
    $data = json_decode($content, true);

    if (!$data) continue;

    if (isset($data['targetLang']) && $data['targetLang'] === 'hu') continue;

    if (isset($data['questions']) && is_array($data['questions'])) {
        foreach ($data['questions'] as $q) {
            if (isset($q['en'])) $textsToGenerate[] = trim($q['en']);
            if (isset($q['correctAnswer'])) $textsToGenerate[] = trim($q['correctAnswer']);
            if (isset($q['scrambledWords']) && is_array($q['scrambledWords'])) {
                foreach ($q['scrambledWords'] as $w) $textsToGenerate[] = trim($w);
            }
            if (isset($q['newWords']) && is_array($q['newWords'])) {
                foreach ($q['newWords'] as $w) $textsToGenerate[] = trim($w);
            }
        }
    }

    if (isset($data['en'])) $textsToGenerate[] = trim($data['en']);
    if (isset($data['correctAnswer'])) $textsToGenerate[] = trim($data['correctAnswer']);
    if (isset($data['scrambledWords']) && is_array($data['scrambledWords'])) {
        foreach ($data['scrambledWords'] as $w) $textsToGenerate[] = trim($w);
    }
    if (isset($data['newWords']) && is_array($data['newWords'])) {
        foreach ($data['newWords'] as $w) $textsToGenerate[] = trim($w);
    }

    if (isset($data['dictionary']) && is_array($data['dictionary'])) {
        foreach (array_keys($data['dictionary']) as $word) {
            $textsToGenerate[] = trim($word);
        }
    }
}

$textsToGenerate = array_filter(array_unique($textsToGenerate));
$output .= "<p>Found " . count($textsToGenerate) . " unique English phrases/words.</p>";

$googleApiKey = getenv('GOOGLE_TTS_API_KEY') ?: (defined('GOOGLE_TTS_API_KEY') ? GOOGLE_TTS_API_KEY : '');
if (!$googleApiKey) {
    throw new RuntimeException('GOOGLE_TTS_API_KEY is not configured.');
}
$generatedCount = 0;
$cachedCount = 0;
$errorCount = 0;

foreach ($textsToGenerate as $text) {
    if (empty($text)) continue;

    $textHash = md5($text);

    $stmt = $pdo->prepare("SELECT filename FROM tts_cache WHERE text_hash = :hash LIMIT 1");
    $stmt->execute(['hash' => $textHash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && !empty($row['filename']) && file_exists($projectRoot . '/audio/' . $row['filename'])) {
        $cachedCount++;
        continue;
    }

    $url = "https://texttospeech.googleapis.com/v1/text:synthesize?key=" . $googleApiKey;
    $postData = [
        'input' => ['text' => $text],
        'voice' => ['languageCode' => 'en-US', 'name' => 'en-US-Journey-F'],
        'audioConfig' => ['audioEncoding' => 'MP3', 'speakingRate' => 0.85]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode === 200) {
        $responseData = json_decode($response, true);
        if (isset($responseData['audioContent'])) {
            $audioContent = base64_decode($responseData['audioContent']);
            $filename = 'tts_' . $textHash . '.mp3';
            $filepath = $projectRoot . '/audio/' . $filename;

            if (!is_dir($projectRoot . '/audio')) {
                mkdir($projectRoot . '/audio', 0755, true);
            }

            if (file_put_contents($filepath, $audioContent)) {
                $stmtInsert = $pdo->prepare("INSERT INTO tts_cache (text_hash, text, filename) VALUES (:hash, :txt, :file) ON DUPLICATE KEY UPDATE filename = :file");
                $stmtInsert->execute(['hash' => $textHash, 'txt' => $text, 'file' => $filename]);
                $generatedCount++;
            } else {
                $errorCount++;
            }
        } else {
            $errorCount++;
        }
    } else {
        $errorCount++;
    }

    usleep(250000);
}

$output .= "<p>✅ Finished parsing!</p>";
$output .= "<ul>";
$output .= "<li>Already Cached (Skipped): $cachedCount</li>";
$output .= "<li>Newly Generated: $generatedCount</li>";
$output .= "<li>Errors (API/Write Fails): $errorCount</li>";
$output .= "</ul>";

echo $output;
?>
