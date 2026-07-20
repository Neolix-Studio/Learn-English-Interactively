<?php
$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/security.php';
require_once $projectRoot . '/db_config.php';
security_require_cli_or_token();

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    echo "Starting database reset...<br><br>";

    foreach ($tables as $table) {
        if ($table !== 'tts_cache' && $table !== 'migration_history') {
            $pdo->exec("TRUNCATE TABLE `$table`");
            echo "✅ Truncated table: <strong>$table</strong><br>";
        } else {
            echo "⏭️ Skipped table: <strong>$table</strong><br>";
        }
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "<br>🎉 <strong>Database successfully reset!</strong> You can now test with a fresh account.";
} catch (PDOException $e) {
    echo "<br>❌ Error: " . $e->getMessage();
}
