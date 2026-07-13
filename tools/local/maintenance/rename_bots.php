<?php
$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/security.php';
require_once $projectRoot . '/db_config.php';
security_require_cli_or_token();

$adjectives = ['Cool', 'Happy', 'Fast', 'Smart', 'Lucky', 'Brave', 'Clever', 'Super', 'Epic', 'Ninja', 'Pro', 'Sleepy', 'Fierce', 'Mighty', 'Swift', 'Wild'];
$nouns = ['Panda', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Lion', 'Gamer', 'Student', 'Learner', 'Hero', 'Dragon', 'Shark', 'Hawk', 'Rhino'];
$names = ['Alex', 'David', 'Sarah', 'Emma', 'Tom', 'John', 'Anna', 'Lucas', 'Mia', 'Oliver', 'Sophie', 'Max', 'Leo', 'Zoe', 'Eva'];

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Find all users that look like our bots
    $stmt = $pdo->query("SELECT id FROM users WHERE email LIKE 'bot%@lexipaws.local' OR username LIKE 'LexiBot_%'");
    $bots = $stmt->fetchAll();
    
    if (!$bots) {
        echo json_encode(["status" => "info", "message" => "No bots found to rename!"]);
        exit;
    }
    
    $updateStmt = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
    
    $count = 0;
    foreach ($bots as $bot) {
        $success = false;
        $attempts = 0;
        
        while (!$success && $attempts < 10) {
            $type = mt_rand(1, 4);
            if ($type === 1) {
                $newName = $adjectives[array_rand($adjectives)] . $nouns[array_rand($nouns)];
            } else if ($type === 2) {
                $newName = $names[array_rand($names)] . mt_rand(1, 99);
            } else if ($type === 3) {
                $newName = $names[array_rand($names)] . '_' . $nouns[array_rand($nouns)];
            } else {
                $newName = $names[array_rand($names)] . mt_rand(80, 99);
            }
            
            try {
                $updateStmt->execute([$newName, $bot['id']]);
                $success = true;
                $count++;
            } catch (PDOException $e) {
                // If it's a duplicate entry error (1062), just try again
                if ($e->getCode() == 23000) {
                    $attempts++;
                } else {
                    throw $e; // Rethrow other errors
                }
            }
        }
    }
    
    echo json_encode(["status" => "success", "message" => "Successfully renamed $count bots to normal player names!"]);
    
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
