<?php
$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/security.php';
require_once $projectRoot . '/db_config.php';
security_require_cli_or_token();

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Fixing AUTO_INCREMENT on tables...<br><br>";

    $tables_to_fix = [
        'users' => 'id',
        'user_subscriptions' => 'id',
        'migration_history' => 'id',
        'failed_exercises' => 'id',
        'leagues' => 'id',
        'character_progress' => 'id',
        'user_rewards' => 'id',
        'user_mistakes' => 'id',
        'user_vocabulary' => 'id',
        'user_inventory' => 'id'
    ];

    foreach ($tables_to_fix as $table => $column) {
        try {
            $pdo->exec("ALTER TABLE `$table` MODIFY `$column` INT AUTO_INCREMENT");
            echo "✅ Fixed AUTO_INCREMENT for <strong>$table</strong>.<br>";
        } catch (PDOException $e) {
            echo "⚠️ Could not modify <strong>$table</strong> (maybe it doesn't exist yet or already has it). Error: " . $e->getMessage() . "<br>";
        }
    }

    echo "<br>Adding new columns if they don't exist...<br><br>";
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `preferred_language` VARCHAR(10) DEFAULT NULL");
        echo "✅ Added `preferred_language` column to `users` table.<br>";
    } catch (PDOException $e) {
        // 1060 is "Duplicate column name", meaning it already exists, which is fine
        if ($e->getCode() == '42S21' || strpos($e->getMessage(), '1060') !== false) {
            echo "✅ `preferred_language` column already exists in `users` table.<br>";
        } else {
            echo "⚠️ Could not add `preferred_language` column. Error: " . $e->getMessage() . "<br>";
        }
    }

    echo "<br>🎉 <strong>Database structure successfully repaired!</strong> You can now register normally.";
} catch (PDOException $e) {
    echo "<br>❌ Connection Error: " . $e->getMessage();
}
