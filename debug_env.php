<?php
header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/db_config.php';
$hasConfig = file_exists($configPath);
if ($hasConfig) {
    require_once $configPath;
}

$definedToken = defined('MIGRATION_TOKEN') ? MIGRATION_TOKEN : null;
$headers = getallheaders();

echo json_encode([
    'db_config_exists' => $hasConfig,
    'token_constant_defined' => defined('MIGRATION_TOKEN'),
    'token_constant_length' => $definedToken ? strlen($definedToken) : 0,
    'token_constant_preview' => $definedToken ? (substr($definedToken, 0, 3) . '...' . substr($definedToken, -3)) : null,
    'provided_get_token_length' => isset($_GET['token']) ? strlen($_GET['token']) : 0,
    'provided_header_token_length' => isset($_SERVER['HTTP_X_MIGRATION_TOKEN']) ? strlen($_SERVER['HTTP_X_MIGRATION_TOKEN']) : 0,
    'all_headers' => $headers,
    'server_variables_subset' => [
        'HTTP_X_MIGRATION_TOKEN' => isset($_SERVER['HTTP_X_MIGRATION_TOKEN']) ? 'present' : 'absent',
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? null,
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? null,
    ]
], JSON_PRETTY_PRINT);
