<?php
require_once __DIR__ . '/security.php';
security_start_session();

if (!file_exists(__DIR__ . '/db_config.php')) {
    http_response_code(500);
    echo 'Database configuration file is missing.';
    exit;
}

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/mailer.php';

function betaAdminExpectedToken(): string {
    $token = getenv('MAINTENANCE_TOKEN');
    if (!$token && defined('MAINTENANCE_TOKEN')) {
        $token = constant('MAINTENANCE_TOKEN');
    }
    return (string)$token;
}

function betaAdminIsAuthenticated(): bool {
    return !empty($_SESSION['beta_admin_authenticated']);
}

function betaAdminRequireAuth(): void {
    if (betaAdminIsAuthenticated()) {
        return;
    }
    http_response_code(403);
    echo 'Access denied.';
    exit;
}

function betaAdminConnect(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
}

function betaAdminBaseUrl(): string {
    if (defined('APP_BASE_URL')) {
        $configured = rtrim((string)APP_BASE_URL, '/');
        $parts = parse_url($configured);
        if (is_array($parts) && in_array($parts['scheme'] ?? '', ['http', 'https'], true) && !empty($parts['host'])) {
            return $configured;
        }
    }

    $host = $_SERVER['HTTP_HOST'] ?? 'lexipaws.eu';
    $scheme = str_starts_with($host, 'localhost') ? 'http' : 'https';
    return $scheme . '://' . $host;
}

function betaAdminGenerateInviteCode(): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return 'LEXI-' . substr($code, 0, 4) . '-' . substr($code, 4, 4);
}

function betaAdminSendApprovalEmail(string $email, string $name, string $baseLanguage, string $inviteLink): bool {
    $displayName = $name !== '' ? $name : 'there';
    $subject = 'Your Lexipaws beta access is approved';
    $header = 'Beta access approved';
    $body = '<p>Hi ' . htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>Your Lexipaws beta access request has been approved.</p>'
        . '<p>Use the button below to create your account. Please register with this same email address so your invite can be matched correctly.</p>';
    $buttonText = 'Create your account';

    if ($baseLanguage === 'hu') {
        $subject = 'Jóváhagytuk a Lexipaws béta hozzáférésedet';
        $header = 'Béta hozzáférés jóváhagyva';
        $body = '<p>Szia ' . htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8') . '!</p>'
            . '<p>Jóváhagytuk a Lexipaws béta hozzáférési kérelmedet.</p>'
            . '<p>A lenti gombbal létrehozhatod a fiókodat. Kérjük, ugyanazzal az e-mail címmel regisztrálj, hogy a meghívót biztosan össze tudjuk kapcsolni a fiókoddal.</p>';
        $buttonText = 'Fiók létrehozása';
    }

    return sendLexipawsEmail($email, $subject, $header, $body, $buttonText, $inviteLink);
}

function betaAdminApproveRequest(PDO $pdo, int $requestId): array {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            SELECT id, email, name, base_language, status
            FROM beta_access_requests
            WHERE id = ?
            FOR UPDATE
        ");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch();

        if (!$request) {
            $pdo->rollBack();
            return ['type' => 'error', 'text' => 'Beta request not found.'];
        }
        if ($request['status'] !== 'pending') {
            $pdo->rollBack();
            return ['type' => 'error', 'text' => 'Only pending beta requests can be approved.'];
        }

        $inviteCode = '';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = betaAdminGenerateInviteCode();
            $inviteHash = hash('sha256', strtoupper(trim($candidate)));
            try {
                $stmtInvite = $pdo->prepare("
                    INSERT INTO beta_invites (email, invite_code_hash, invited_by, expires_at)
                    VALUES (?, ?, 'beta_admin', DATE_ADD(NOW(), INTERVAL 30 DAY))
                ");
                $stmtInvite->execute([$request['email'], $inviteHash]);
                $inviteCode = $candidate;
                break;
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') {
                    throw $e;
                }
            }
        }

        if ($inviteCode === '') {
            $pdo->rollBack();
            return ['type' => 'error', 'text' => 'Could not generate a unique invite code. Please try again.'];
        }

        $stmtUpdate = $pdo->prepare("UPDATE beta_access_requests SET status = 'invited' WHERE id = ?");
        $stmtUpdate->execute([$requestId]);
        $pdo->commit();

        $inviteLink = betaAdminBaseUrl() . '/?' . http_build_query([
            'invite' => $inviteCode,
            'email' => $request['email']
        ]);

        $emailSent = betaAdminSendApprovalEmail(
            $request['email'],
            (string)($request['name'] ?? ''),
            (string)($request['base_language'] ?? 'hu'),
            $inviteLink
        );

        if (!$emailSent) {
            return [
                'type' => 'warning',
                'text' => 'Invite created, but the approval email failed to send. Copy this link manually: ' . $inviteLink
            ];
        }

        return ['type' => 'success', 'text' => 'Approved and emailed invite link to ' . $request['email'] . '.'];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Beta admin approval error: ' . $e->getMessage());
        return ['type' => 'error', 'text' => 'Approval failed. Check server logs for details.'];
    }
}

function betaAdminFetchRequests(PDO $pdo): array {
    $stmt = $pdo->query("
        SELECT id, email, name, base_language, message, status, created_at, updated_at
        FROM beta_access_requests
        WHERE status IN ('pending', 'invited')
        ORDER BY status = 'pending' DESC, created_at ASC
        LIMIT 100
    ");
    return $stmt->fetchAll();
}

$expectedToken = betaAdminExpectedToken();
$message = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
    $providedToken = (string)($_POST['maintenance_token'] ?? '');
    if ($expectedToken !== '' && hash_equals($expectedToken, $providedToken)) {
        session_regenerate_id(true);
        $_SESSION['beta_admin_authenticated'] = true;
    } else {
        $message = ['type' => 'error', 'text' => 'Invalid maintenance token.'];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'logout') {
    unset($_SESSION['beta_admin_authenticated']);
}

$pdo = null;
if (betaAdminIsAuthenticated()) {
    $pdo = betaAdminConnect();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'approve') {
    betaAdminRequireAuth();
    security_validate_csrf();
    $message = betaAdminApproveRequest($pdo, (int)($_POST['request_id'] ?? 0));
}

$requests = betaAdminIsAuthenticated() && $pdo ? betaAdminFetchRequests($pdo) : [];
$csrfToken = betaAdminIsAuthenticated() ? security_get_csrf_token() : '';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lexipaws Beta Admin</title>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #101827; color: #eef4ff; }
        main { width: min(1040px, calc(100% - 32px)); margin: 40px auto; }
        h1 { margin: 0 0 8px; font-size: 28px; }
        p { color: #a9b6ca; }
        form, .panel { background: #172235; border: 1px solid #30415f; border-radius: 8px; padding: 20px; }
        label { display: block; margin-bottom: 8px; color: #cbd5e1; font-weight: 700; }
        input, button { font: inherit; }
        input { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 6px; border: 1px solid #64748b; background: #0f172a; color: #fff; }
        button { border: 0; border-radius: 6px; padding: 10px 14px; background: #16c79a; color: #07111f; font-weight: 800; cursor: pointer; }
        button.secondary { background: #334155; color: #eef4ff; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { border-bottom: 1px solid #30415f; padding: 12px; text-align: left; vertical-align: top; }
        th { color: #cbd5e1; font-size: 13px; text-transform: uppercase; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 24px 0 12px; }
        .message { margin: 18px 0; padding: 14px; border-radius: 6px; }
        .success { background: #063d31; color: #b9f8df; }
        .warning { background: #4a3410; color: #fde8a8; }
        .error { background: #4a1720; color: #ffc4cf; }
        .muted { color: #94a3b8; font-size: 14px; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #26364f; font-size: 13px; }
    </style>
</head>
<body>
<main>
    <h1>Lexipaws Beta Admin</h1>
    <p>Review pending beta access requests and send invite links.</p>

    <?php if ($message): ?>
        <div class="message <?php echo htmlspecialchars($message['type'], ENT_QUOTES, 'UTF-8'); ?>">
            <?php echo htmlspecialchars($message['text'], ENT_QUOTES, 'UTF-8'); ?>
        </div>
    <?php endif; ?>

    <?php if (!betaAdminIsAuthenticated()): ?>
        <form method="post">
            <input type="hidden" name="action" value="login">
            <label for="maintenance-token">Maintenance token</label>
            <input id="maintenance-token" name="maintenance_token" type="password" autocomplete="current-password" required>
            <p class="muted">Use the same token configured as MAINTENANCE_TOKEN in GitHub/Websupport.</p>
            <button type="submit">Open Beta Admin</button>
        </form>
    <?php else: ?>
        <div class="toolbar">
            <div class="muted"><?php echo count($requests); ?> pending/invited requests shown</div>
            <form method="post" style="padding: 0; background: transparent; border: 0;">
                <input type="hidden" name="action" value="logout">
                <button class="secondary" type="submit">Log out</button>
            </form>
        </div>

        <div class="panel">
            <?php if (empty($requests)): ?>
                <p>No pending beta requests.</p>
            <?php else: ?>
                <table>
                    <thead>
                    <tr>
                        <th>Status</th>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Language</th>
                        <th>Message</th>
                        <th>Requested</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($requests as $request): ?>
                        <tr>
                            <td><span class="status"><?php echo htmlspecialchars($request['status'], ENT_QUOTES, 'UTF-8'); ?></span></td>
                            <td><?php echo htmlspecialchars($request['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($request['name'] ?? '', ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($request['base_language'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo nl2br(htmlspecialchars($request['message'] ?? '', ENT_QUOTES, 'UTF-8')); ?></td>
                            <td><?php echo htmlspecialchars($request['created_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td>
                                <?php if ($request['status'] === 'pending'): ?>
                                    <form method="post" style="padding: 0; background: transparent; border: 0;">
                                        <input type="hidden" name="action" value="approve">
                                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
                                        <input type="hidden" name="request_id" value="<?php echo (int)$request['id']; ?>">
                                        <button type="submit">Approve + email</button>
                                    </form>
                                <?php else: ?>
                                    <span class="muted">Already invited</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</main>
</body>
</html>
