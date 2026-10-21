<?php

function security_is_https(): bool {
    return (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
}

// A learner stays signed in for 30 days after their last visit, not after their
// last login (UX3-1a): an authenticated request re-issues the cookie with a fresh
// 30-day expiry, at most once a day.
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24;

function security_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_start([
        'cookie_lifetime' => SESSION_LIFETIME_SECONDS,
        // Every entry point has to set this: a garbage collection started from a
        // script on PHP's default (24 minutes) deletes every session file idle
        // for longer. PHP touches the file on each request, so an active
        // learner's file never gets that old.
        'gc_maxlifetime' => SESSION_LIFETIME_SECONDS,
        'cookie_path' => '/',
        'cookie_secure' => security_is_https(),
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax'
    ]);

    security_slide_session();
}

function security_slide_session(): void {
    if (!isset($_SESSION['user_id'])) {
        return;
    }

    $issuedAt = $_SESSION['cookie_issued_at'] ?? null;
    $age = is_int($issuedAt) ? time() - $issuedAt : null;

    // The last cookie this session was given has run out, so whoever still
    // sends it is signed out, as a browser would be.
    if ($age !== null && $age >= SESSION_LIFETIME_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
        return;
    }

    // A session from before UX3-1a has no stamp and is renewed now.
    if ($age === null || $age >= SESSION_RENEW_AFTER_SECONDS) {
        security_renew_session_cookie();
    }
}

// Sends the session cookie again with a fresh expiry and the flags
// session_start() gave it.
function security_renew_session_cookie(): void {
    if (headers_sent()) {
        return;
    }

    $params = session_get_cookie_params();
    setcookie(session_name(), session_id(), [
        'expires' => time() + SESSION_LIFETIME_SECONDS,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite']
    ]);
    security_mark_session_cookie_issued();
}

// session_regenerate_id() at login and signup sends a fresh 30-day cookie of
// its own; stamping it stops the next request from sending a second one.
function security_mark_session_cookie_issued(): void {
    $_SESSION['cookie_issued_at'] = time();
}

// The one origin allowlist, for api.php, api/tts.php, upload_avatar.php and
// report_problem.php. Localhost origins count only when PHP itself runs under
// `php -S` (the local stack and the security test), never on the host.
function security_allowed_origins(): array {
    $origins = [
        'https://dev.lexipaws.eu',
        'https://lexipaws.eu',
        'https://www.lexipaws.eu',
        'https://lexipaws.hu',
        'https://lexipaws.sk'
    ];

    if (PHP_SAPI === 'cli-server') {
        array_push($origins,
            'http://localhost',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080'
        );
    }

    return $origins;
}

function security_send_cors_headers(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '' || !in_array($origin, security_allowed_origins(), true)) {
        return;
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Vary: Origin');
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

    $provided = '';
    if ($tokenConstant === 'MIGRATION_TOKEN') {
        $provided = $_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? '';
    } elseif ($tokenConstant === 'CRON_SECRET') {
        $provided = $_SERVER['HTTP_X_CRON_SECRET'] ?? ($_GET['secret'] ?? '');
    } elseif ($tokenConstant === 'MAINTENANCE_TOKEN') {
        $provided = $_SERVER['HTTP_X_MAINTENANCE_TOKEN'] ?? '';
    } else {
        $headerName = 'HTTP_X_' . $tokenConstant;
        $provided = $_SERVER[$headerName] ?? '';
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

/**
 * The calendar day a learner's activity counts for, as Y-m-d.
 *
 * Always Europe/Budapest, which is the same zone as Europe/Bratislava, so the
 * day ends at the learner's midnight whatever PHP's date.timezone or the
 * database server's time zone are set to. save_progress stamps
 * user_progress.last_active_date with it and cron_notifications.php compares
 * against it; neither uses CURDATE().
 */
function lexipaws_activity_date(int $daysAgo = 0, ?int $now = null): string {
    $local = (new DateTimeImmutable('@' . ($now ?? time())))->setTimezone(new DateTimeZone('Europe/Budapest'));
    return $local->modify('-' . max(0, $daysAgo) . ' days')->format('Y-m-d');
}

function security_sanitize_log_line(string $value, int $maxLength = 2000): string {
    $value = preg_replace('/[\r\n\t]+/', ' ', $value);
    return mb_substr($value ?? '', 0, $maxLength);
}
