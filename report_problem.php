<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/security.php';
security_start_session();
security_validate_same_origin(security_allowed_origins());

function report_problem_error(int $statusCode, string $clientMessage, string $logMessage = ''): void {
    if ($logMessage !== '') {
        error_log('Report problem error: ' . security_sanitize_log_line($logMessage));
    }

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'error' => $clientMessage]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    report_problem_error(405, 'Method not allowed');
}

if (!security_rate_limit('report_problem_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 3600)) {
    report_problem_error(429, 'Túl sok jelentést küldtél. Kérjük, próbáld újra később.');
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    report_problem_error(400, 'Érvénytelen kérés.');
}

$issueType = security_sanitize_log_line(isset($data['issueType']) ? (string)$data['issueType'] : 'Unknown', 50);
$description = security_sanitize_log_line(isset($data['description']) ? (string)$data['description'] : 'No description provided', 4000);
$steps = security_sanitize_log_line(isset($data['steps']) ? (string)$data['steps'] : 'No steps provided', 4000);
$userEmail = isset($data['userEmail']) && filter_var($data['userEmail'], FILTER_VALIDATE_EMAIL) ? $data['userEmail'] : '';
$contextData = isset($data['contextData']) && is_array($data['contextData']) ? $data['contextData'] : [];
$browserInfo = isset($data['browserInfo']) && is_array($data['browserInfo']) ? $data['browserInfo'] : [];
$timestamp = security_sanitize_log_line(isset($data['timestamp']) ? (string)$data['timestamp'] : date('c'), 100);

$allowedIssueTypes = ['bug', 'typo', 'audio', 'feature', 'other'];
if (!in_array($issueType, $allowedIssueTypes, true)) {
    $issueType = 'other';
}

if (trim($description) === '' || $description === 'No description provided') {
    report_problem_error(400, 'Kérjük, írd le a problémát.');
}

$jiraEmailAddress = 'support@lexipaws.atlassian.net';
$fromEmail = 'noreply@lexipaws.eu';

$subject = "[Lexipaws " . ucfirst($issueType) . "] Problem Report";

$body = "A new problem has been reported from the Lexipaws app.\n\n";
$body .= "--- ISSUE DETAILS ---\n";
$body .= "Type: " . ucfirst($issueType) . "\n";
if (!empty($userEmail)) {
    $body .= "User Email: " . $userEmail . "\n";
}
$body .= "Description:\n" . $description . "\n\n";

if (trim($steps) !== '') {
    $body .= "Steps to Reproduce:\n" . $steps . "\n\n";
}

$body .= "--- CONTEXT DATA ---\n";
if (!empty($contextData)) {
    foreach ($contextData as $key => $value) {
        $valStr = security_sanitize_log_line(is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string)$value, 1000);
        $body .= ucfirst($key) . ": " . $valStr . "\n";
    }
} else {
    $body .= "No specific context (Global)\n";
}
$body .= "\n";

$body .= "--- BROWSER INFO ---\n";
if (!empty($browserInfo)) {
    foreach ($browserInfo as $key => $value) {
        $body .= ucfirst($key) . ": " . security_sanitize_log_line((string)$value, 1000) . "\n";
    }
}
$body .= "\n";
$body .= "Reported At: " . $timestamp . "\n";

$replyTo = !empty($userEmail) ? $userEmail : $fromEmail;

$headers = [
    'From' => $fromEmail,
    'Reply-To' => $replyTo,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'X-Mailer' => 'PHP/' . phpversion()
];

$encodedSubject = mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
$success = mail($jiraEmailAddress, $encodedSubject, $body, $headers);

if ($success) {
    echo json_encode(['success' => true, 'message' => 'Report sent successfully']);
} else {
    report_problem_error(500, 'A jelentést most nem sikerült elküldeni. Kérjük, próbáld újra később.', 'mail() returned false');
}
