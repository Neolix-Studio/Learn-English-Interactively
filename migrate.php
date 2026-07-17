<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$configPath = __DIR__ . '/db_config.php';
if (!file_exists($configPath)) {
    echo json_encode(['success' => false, 'error' => 'db_config.php not found.']);
    exit(1);
}
require_once $configPath;
require_once __DIR__ . '/security.php';

$isCli = (php_sapi_name() === 'cli');

function migration_format_errors(array $errors, bool $isCli): array {
    if ($isCli) {
        return $errors;
    }

    return empty($errors) ? [] : ['Migration failed. Check server logs for details.'];
}

function migration_log_error(string $message): void {
    error_log('[migration] ' . $message);
}

security_require_cli_or_token('MIGRATION_TOKEN');

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    migration_log_error('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    $message = $isCli ? 'Database connection failed: ' . $e->getMessage() : 'Database connection failed.';
    echo json_encode(['success' => false, 'error' => $message]);
    exit(1);
}

class MigrationException extends RuntimeException {}

$applied = [];
$errors = [];

try {
    $historySqlFile = __DIR__ . '/data/migrations/03_create_migration_history.sql';
    if (!file_exists($historySqlFile)) {
        throw new MigrationException("Core migration file 03_create_migration_history.sql is missing!");
    }

    $historySql = file_get_contents($historySqlFile);
    $pdo->exec($historySql);

    $stmt = $pdo->query("SELECT migration_name FROM migration_history");
    $appliedMigrations = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $migrationsDir = __DIR__ . '/data/migrations';
    $files = glob($migrationsDir . '/*.sql');
    sort($files);

    foreach ($files as $file) {
        $fileName = basename($file);

        if ($fileName === '03_create_migration_history.sql') {
            continue;
        }

        if (!in_array($fileName, $appliedMigrations)) {
            $sqlContent = file_get_contents($file);
            if (empty(trim($sqlContent))) {
                continue;
            }

            try {
                $pdo->beginTransaction();
                $pdo->exec($sqlContent);
                $logStmt = $pdo->prepare("INSERT INTO migration_history (migration_name) VALUES (?)");
                $logStmt->execute([$fileName]);

                if ($pdo->inTransaction()) {
                    $pdo->commit();
                }

                $applied[] = $fileName;
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $errorMessage = "Migration '$fileName' failed: " . $e->getMessage();
                migration_log_error($errorMessage);
                $errors[] = $errorMessage;
                break;
            }
        }
    }
} catch (Exception $e) {
    $errorMessage = "Global migration manager error: " . $e->getMessage();
    migration_log_error($errorMessage);
    $errors[] = $errorMessage;
}

$status = empty($errors);
$response = [
    'success' => $status,
    'applied' => $applied,
    'errors' => migration_format_errors($errors, $isCli)
];

if (!$status) {
    http_response_code(500);
}

echo json_encode($response, JSON_PRETTY_PRINT);
if (!$status && $isCli) {
    exit(1);
}
exit(0);
