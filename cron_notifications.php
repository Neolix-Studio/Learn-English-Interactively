<?php
/**
 * Cron Job: Notifications
 * Run daily to check and send engagement emails (inactivity, streaks, milestones).
 * Usage (CLI): php cron_notifications.php
 */

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/security.php';
security_require_cli_or_token('CRON_SECRET');
require_once __DIR__ . '/mailer.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    echo "Running notifications cron job...\n";

    // -------------------------------------------------------------
    // 1. Inactivity Nudges (2 Days missed)
    // -------------------------------------------------------------
    // Users who haven't logged in for > 48 hours but < 10 days.
    // If they got < 2 emails, we send them. If they got 2, we wait a week.
    $stmtInactivity = $pdo->query("
        SELECT id, email, username, inactivity_email_count, last_inactivity_email_sent, last_login_at, notification_preferences, base_language
        FROM users
        WHERE last_login_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
          AND last_login_at > DATE_SUB(NOW(), INTERVAL 14 DAY)
    ");
    $inactiveUsers = $stmtInactivity->fetchAll();

    foreach ($inactiveUsers as $user) {
        $prefs = json_decode($user['notification_preferences'] ?? '{}', true);
        if (isset($prefs['inactivity']) && $prefs['inactivity'] === false) {
            continue;
        }
        
        $shouldSend = false;
        
        if ($user['inactivity_email_count'] < 2) {
            // First 2 nudges can be sent 48 hours apart from each other
            if (empty($user['last_inactivity_email_sent']) || strtotime($user['last_inactivity_email_sent']) < strtotime('-48 hours')) {
                $shouldSend = true;
            }
        } else {
            // After 2 nudges, only send once a week
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
            }
        }
    }

    // -------------------------------------------------------------
    // 2. Streak Protection
    // -------------------------------------------------------------
    // Check users who haven't played yesterday and might lose their streak today.
    // If they have shields, use one and email them.
    // We only send the email if last_streak_email_sent is null or > 24 hours ago.
    $stmtStreak = $pdo->query("
        SELECT u.id, u.email, u.username, u.last_streak_email_sent, u.notification_preferences, u.base_language,
               up.streak_count, up.streak_shields, up.last_active_date
        FROM users u
        JOIN user_progress up ON u.id = up.user_id
        WHERE up.streak_count > 0 
          AND up.last_active_date < CURDATE() - INTERVAL 1 DAY
    ");
    $atRiskUsers = $stmtStreak->fetchAll();

    foreach ($atRiskUsers as $user) {
        if ($user['streak_shields'] > 0) {
            // They have a shield. Consume it.
            // We set last_active_date to yesterday so that today they are still eligible to play and not lose it instantly again.
            $consumeStmt = $pdo->prepare("
                UPDATE user_progress 
                SET streak_shields = streak_shields - 1, 
                    last_active_date = CURDATE() - INTERVAL 1 DAY 
                WHERE user_id = ?
            ");
            $consumeStmt->execute([$user['id']]);

            $prefs = json_decode($user['notification_preferences'] ?? '{}', true);
            if (isset($prefs['milestones']) && $prefs['milestones'] === false) {
                echo "Skipped streak email for {$user['email']} due to preferences\n";
                continue;
            }

            // Email logic
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
                }
            }
        } else {
            // No shields left, streak is broken.
            $breakStmt = $pdo->prepare("UPDATE user_progress SET streak_count = 0 WHERE user_id = ?");
            $breakStmt->execute([$user['id']]);
            echo "Broke streak for user {$user['email']}\n";
        }
    }

    echo "Cron job finished successfully.\n";

} catch (Exception $e) {
    error_log("Notifications Cron Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage() . "\n";
}
