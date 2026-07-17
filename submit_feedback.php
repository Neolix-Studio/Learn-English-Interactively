<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
require_once __DIR__ . '/security.php';
security_start_session();
security_validate_same_origin(security_allowed_origins());
require_once 'db_config.php';

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

security_validate_csrf();

if (!security_rate_limit('feedback_' . $_SESSION['user_id'], 10, 3600)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many feedback submissions. Please try again later.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'] ?? 'Unknown User';
$input = json_decode(file_get_contents('php://input'), true);

$type = security_sanitize_log_line($input['type'] ?? 'general', 50);
$answers = isset($input['answers']) && is_array($input['answers']) ? $input['answers'] : [];

if ($type === 'energy_refill') {
    $stmt = $pdo->prepare("SELECT last_feedback_refill FROM user_metadata WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && $row['last_feedback_refill']) {
        $last_refill = new DateTime($row['last_feedback_refill']);
        $now = new DateTime();
        $diff = $now->getTimestamp() - $last_refill->getTimestamp();

        if ($diff < 3600) {
            echo json_encode(['success' => false, 'error' => 'Cooldown active. Try again later.']);
            exit;
        }
    }

    $stmt = $pdo->prepare("UPDATE user_metadata SET last_feedback_refill = CURRENT_TIMESTAMP WHERE user_id = ?");
    $stmt->execute([$user_id]);
}

$blocks = [
    [
        "type" => "header",
        "text" => [
            "type" => "plain_text",
            "text" => ($type === 'energy_refill' ? "🔋 Energy Refill Feedback" : "🦴 Lexi Treat Feedback"),
            "emoji" => true
        ]
    ],
    [
        "type" => "section",
        "fields" => [
            [
                "type" => "mrkdwn",
                "text" => "*User:*\n" . $username
            ],
            [
                "type" => "mrkdwn",
                "text" => "*Type:*\n" . $type
            ]
        ]
    ],
    [
        "type" => "divider"
    ]
];

foreach ($answers as $q => $a) {
    $q = security_sanitize_log_line((string)$q, 200);
    $a = security_sanitize_log_line(is_scalar($a) ? (string)$a : json_encode($a), 1000);
    $blocks[] = [
        "type" => "section",
        "text" => [
            "type" => "mrkdwn",
            "text" => "*" . $q . "*\n> " . $a
        ]
    ];
}

$slack_payload = json_encode(['blocks' => $blocks]);

function get_feedback_config_value(string $name): string {
    $env_value = getenv($name);
    if ($env_value !== false && $env_value !== '') {
        return $env_value;
    }

    if (defined($name)) {
        return (string)constant($name);
    }

    return '';
}

$slack_webhook_url = get_feedback_config_value('SLACK_WEBHOOK_URL_FEEDBACK');
if ($slack_webhook_url === '') {
    $slack_webhook_url = get_feedback_config_value('SLACK_WEBHOOK_URL');
}

if (!empty($slack_webhook_url)) {
    $ch = curl_init($slack_webhook_url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $slack_payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($slack_payload)
    ]);
    curl_exec($ch);
    curl_close($ch);
}

$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0750, true);
}
file_put_contents($logDir . '/feedback.log', date('Y-m-d H:i:s') . " - User: " . security_sanitize_log_line($username, 100) . " - Payload: " . json_encode($answers) . "\n", FILE_APPEND | LOCK_EX);

echo json_encode(['success' => true]);
