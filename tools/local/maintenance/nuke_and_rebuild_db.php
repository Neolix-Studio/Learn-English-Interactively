<?php
$projectRoot = dirname(__DIR__, 3);

require_once $projectRoot . '/security.php';
require_once $projectRoot . '/db_config.php';
security_require_cli_or_token();

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "<h1>Nuking and Rebuilding Database</h1>";
    
    // Disable foreign key checks to allow dropping tables in any order
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Fetch all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo "<p>Database is already empty. Proceeding to migrations...</p>";
    } else {
        echo "<p>Dropping tables...</p><ul>";
        foreach ($tables as $table) {
            $pdo->exec("DROP TABLE `$table`");
            echo "<li>Dropped table: <strong>$table</strong></li>";
        }
        echo "</ul>";
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "<hr><h2>Running Migrations</h2>";
    
    // Include the migrate script
    $_GET['token'] = MIGRATION_TOKEN;
    ob_start();
    include $projectRoot . '/migrate.php';
    $migrationOutput = ob_get_clean();
    
    echo "<div>$migrationOutput</div>";

    echo "<hr><h2>✅ Complete!</h2>";
    echo "<p>Your database schema has been 100% rebuilt from scratch! You can now register.</p>";

} catch (Exception $e) {
    echo "<p style='color:red;'>❌ Error: " . $e->getMessage() . "</p>";
}
