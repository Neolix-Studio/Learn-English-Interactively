<?php

/**
 * report_problem.php
 * Endpoint for the "Report a Problem" feature.
 * Receives JSON from the frontend, formats it, and emails it to Jira Service Management.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
require_once __DIR__ . '/security.php';
security_start_session();
security_validate_same_origin([
    'https://lexipaws.eu',
    'https://lexipaws.hu',
    'https://lexipaws.sk',
    'https://neolix.studio',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8080'
]);

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!security_rate_limit('report_problem_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 3600)) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many reports. Please try again later.']);
    exit;
}

// Get JSON payload
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Extract fields
$issueType = security_sanitize_log_line(isset($data['issueType']) ? (string)$data['issueType'] : 'Unknown', 50);
$description = security_sanitize_log_line(isset($data['description']) ? (string)$data['description'] : 'No description provided', 4000);
$steps = security_sanitize_log_line(isset($data['steps']) ? (string)$data['steps'] : 'No steps provided', 4000);
$userEmail = isset($data['userEmail']) && filter_var($data['userEmail'], FILTER_VALIDATE_EMAIL) ? $data['userEmail'] : '';
$contextData = isset($data['contextData']) ? $data['contextData'] : [];
$browserInfo = isset($data['browserInfo']) ? $data['browserInfo'] : [];
$timestamp = security_sanitize_log_line(isset($data['timestamp']) ? (string)$data['timestamp'] : date('c'), 100);

// =========================================================================
// CONFIGURATION
// =========================================================================
// Replace this with your Jira Service Management inbound email address!
// Example: lexipaws@lexipaws.atlassian.net
$jiraEmailAddress = 'support@lexipaws.atlassian.net';
$fromEmail = 'noreply@lexipaws.eu';
// =========================================================================

// Set Email Subject
// Jira uses the subject as the ticket summary.
$subject = "[Lexipaws " . ucfirst($issueType) . "] Problem Report";

// Build Email Body
// Jira Service Management accepts plain text or HTML. Plain text is often safer for Jira parsing.
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
        $valStr = security_sanitize_log_line(is_array($value) ? json_encode($value) : (string)$value, 1000);
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

// Build Headers
$replyTo = !empty($userEmail) ? $userEmail : $fromEmail;

$headers = [
    'From' => $fromEmail,
    'Reply-To' => $replyTo,
    'X-Mailer' => 'PHP/' . phpversion()
];

// Send Email
$success = mail($jiraEmailAddress, $subject, $body, $headers);

if ($success) {
    echo json_encode(['success' => true, 'message' => 'Report sent successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email. Check PHP mail configuration.']);
}
