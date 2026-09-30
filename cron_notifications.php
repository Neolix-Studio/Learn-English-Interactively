<?php

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/security.php';
security_require_cli_or_token('CRON_SECRET');
require_once __DIR__ . '/mailer.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    echo "Running notifications cron job...\n";

    // One clock reading for the whole run, in learner days: see lexipaws_activity_date().
    $now = time();
    $yesterday = lexipaws_activity_date(1, $now);
    $twoDaysAgo = lexipaws_activity_date(2, $now);

    // The first full day after save_progress began to stamp last_active_date
    // itself (#358). An earlier date may come from the old app's client, or
    // from this cron's earlier version, which took a shield from every stale
    // row each night. Rows with such a date are never mailed and never
    // touched. (The local stack and the test suite set their own day in the
    // config they generate.)
    $trustedFrom = defined('ACTIVITY_DATES_TRUSTED_FROM') ? ACTIVITY_DATES_TRUSTED_FROM : '2026-10-01';

    // Inactivity is keyed on the last day with a successful save, not on the
    // last password login: a learner who stays signed in has an old login. A
    // row that was never stamped (NULL) gets no mail.
    $stmtInactivity = $pdo->prepare("
        SELECT u.id, u.email, u.username, u.inactivity_email_count, u.last_inactivity_email_sent, u.notification_preferences, u.base_language
        FROM users u
        JOIN user_progress up ON up.user_id = u.id
        WHERE up.last_active_date <= ?
          AND up.last_active_date > ?
          AND up.last_active_date >= ?
    ");
    $stmtInactivity->execute([$twoDaysAgo, lexipaws_activity_date(14, $now), $trustedFrom]);
    $inactiveUsers = $stmtInactivity->fetchAll();

    foreach ($inactiveUsers as $user) {
        $prefs = json_decode($user['notification_preferences'] ?? '{}', true);
        if (isset($prefs['inactivity']) && $prefs['inactivity'] === false) {
            continue;
        }

        $shouldSend = false;

        if ($user['inactivity_email_count'] < 2) {
            if (empty($user['last_inactivity_email_sent']) || strtotime($user['last_inactivity_email_sent']) < strtotime('-48 hours')) {
                $shouldSend = true;
            }
        } else {
            if (strtotime($user['last_inactivity_email_sent']) < strtotime('-7 days')) {
                $shouldSend = true;
            }
        }

        if ($shouldSend) {
            $lang = $user['base_language'] ?? 'hu';
            if (sendTemplateEmail($user['email'], 'inactivity', ['username' => $user['username'], 'language' => $lang])) {
                $updateStmt = $pdo->prepare("UPDATE users SET inactivity_email_count = inactivity_email_count + 1, last_inactivity_email_sent = NOW() WHERE id = ?");
                $updateStmt->execute([$user['id']]);
                echo "Sent inactivity email to {$user['email']}\n";
            } else {
                echo "Could not send inactivity email to {$user['email']}\n";
            }
        }
    }

    // Only a row last active exactly two days ago is at risk: that learner
    // missed yesterday, and only yesterday. NULL and older dates are stale
    // rows and are never touched. Moving last_active_date on to yesterday
    // takes the row out of this query, so a missed day costs one shield
    // however often the cron runs.
    $stmtStreak = $pdo->prepare("
        SELECT u.id, u.email, u.username, u.last_streak_email_sent, u.notification_preferences, u.base_language,
               up.streak_count, up.streak_shields, up.last_active_date
        FROM users u
        JOIN user_progress up ON u.id = up.user_id
        WHERE up.streak_count > 0
          AND up.last_active_date = ?
          AND up.last_active_date >= ?
    ");
    $stmtStreak->execute([$twoDaysAgo, $trustedFrom]);
    $atRiskUsers = $stmtStreak->fetchAll();

    // Both writes repeat the date condition, so a save that lands after the
    // SELECT above keeps its shield and its streak.
    $consumeStmt = $pdo->prepare("
        UPDATE user_progress
        SET streak_shields = streak_shields - 1,
            last_active_date = ?
        WHERE user_id = ?
          AND streak_shields > 0
          AND last_active_date = ?
    ");
    $breakStmt = $pdo->prepare("UPDATE user_progress SET streak_count = 0 WHERE user_id = ? AND streak_shields <= 0 AND last_active_date = ?");

    foreach ($atRiskUsers as $user) {
        if ($user['streak_shields'] > 0) {
            $consumeStmt->execute([$yesterday, $user['id'], $twoDaysAgo]);
            if ($consumeStmt->rowCount() === 0) {
                continue;
            }

            $prefs = json_decode($user['notification_preferences'] ?? '{}', true);
            if (isset($prefs['milestones']) && $prefs['milestones'] === false) {
                echo "Skipped streak email for {$user['email']} due to preferences\n";
                continue;
            }

            if (empty($user['last_streak_email_sent']) || strtotime($user['last_streak_email_sent']) < strtotime('-24 hours')) {
                $lang = $user['base_language'] ?? 'hu';
                if (sendTemplateEmail($user['email'], 'streak_protected', [
                    'username' => $user['username'],
                    'currentStreak' => $user['streak_count'],
                    'language' => $lang
                ])) {
                    $updateSent = $pdo->prepare("UPDATE users SET last_streak_email_sent = NOW() WHERE id = ?");
                    $updateSent->execute([$user['id']]);
                    echo "Sent streak protected email to {$user['email']}\n";
                } else {
                    echo "Could not send streak protected email to {$user['email']}\n";
                }
            }
        } else {
            $breakStmt->execute([$user['id'], $twoDaysAgo]);
            if ($breakStmt->rowCount() > 0) {
                echo "Broke streak for user {$user['email']}\n";
            }
        }
    }

    echo "Cron job finished successfully.\n";

} catch (Exception $e) {
    error_log("Notifications Cron Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage() . "\n";
}
