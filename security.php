<?php

function security_is_https(): bool {
    return (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
}

function security_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_start([
        'cookie_lifetime' => 60 * 60 * 24 * 30,
        'cookie_path' => '/',
        'cookie_secure' => security_is_https(),
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax'
    ]);
}

function security_get_csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function security_validate_csrf(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $expected = $_SESSION['csrf_token'] ?? '';
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');

    if (!$expected || !$provided || !hash_equals($expected, $provided)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid security token. Please refresh and try again.']);
        exit;
    }
}

function security_validate_same_origin(array $allowedOrigins): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin && !in_array($origin, $allowedOrigins, true)) {
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
}

function security_require_cli_or_token(string $tokenConstant = 'MAINTENANCE_TOKEN'): void {
    if (php_sapi_name() === 'cli') {
        return;
    }

    $expected = getenv($tokenConstant);
    if (!$expected && defined($tokenConstant)) {
        $expected = constant($tokenConstant);
    }

    $headerName = 'HTTP_X_' . $tokenConstant;
    $provided = $_SERVER[$headerName] ?? ($_SERVER['HTTP_X_MAINTENANCE_TOKEN'] ?? '');
    if ($tokenConstant === 'CRON_SECRET') {
        $provided = $_SERVER['HTTP_X_CRON_SECRET'] ?? ($_GET['secret'] ?? $provided);
    }
    if (!$expected || !$provided || !hash_equals($expected, $provided)) {
        http_response_code(403);
        echo 'Access denied.';
        exit;
    }
}

function security_rate_limit(string $bucket, int $maxAttempts, int $windowSeconds): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        security_start_session();
    }

    $now = time();
    $key = 'rate_limit_' . $bucket;
    $entries = $_SESSION[$key] ?? [];
    $entries = array_values(array_filter($entries, fn($ts) => $ts > ($now - $windowSeconds)));

    if (count($entries) >= $maxAttempts) {
        return false;
    }

    $entries[] = $now;
    $_SESSION[$key] = $entries;
    return true;
}

function security_sanitize_log_line(string $value, int $maxLength = 2000): string {
    $value = preg_replace('/[\r\n\t]+/', ' ', $value);
    return mb_substr($value ?? '', 0, $maxLength);
}
