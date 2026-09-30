<?php
// Seeds the throwaway database that local_stack.sh creates (TOOL-stack, #355).
//
// Run by that script only. It connects through the unix socket it is handed and
// loads no config file, so it cannot reach any other database.

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

function seed_env(string $name): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        fwrite(STDERR, "Missing $name. This script is run by local_stack.sh, not by hand.\n");
        exit(1);
    }
    return $value;
}

$socket = seed_env('STACK_DB_SOCKET');
$repoRoot = seed_env('STACK_REPO_ROOT');
$password = seed_env('SEED_PASSWORD');

$pdo = new PDO('mysql:unix_socket=' . $socket . ';dbname=' . seed_env('STACK_DB_NAME') . ';charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

if ((int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) {
    fwrite(STDERR, "The users table is not empty; refusing to seed.\n");
    exit(1);
}

$insertUser = $pdo->prepare("INSERT INTO users (email, password_hash, username, age_range, base_language, notification_preferences)
    VALUES (?, ?, ?, ?, 'hu', ?)");
$insertProgress = $pdo->prepare("INSERT INTO user_progress
    (user_id, points, completed, scores, level, streak_count, streak_shields, last_active_date, active_theme, energy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'system', 5)");
$insertSubscription = $pdo->prepare("INSERT INTO user_subscriptions (user_id, role, subscription_tier) VALUES (?, 'user', 'free')");

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$notifications = json_encode(['marketing' => false, 'inactivity' => true, 'milestones' => true, 'weekly_report' => true]);
$allLessons = ['completedLessons' => ['lesson_1', 'lesson_2', 'lesson_3', 'lesson_4']];

$pdo->beginTransaction();

// A returning learner: the same state as the ux-shots "signed-in" preset
// (tools/local/ux-shots/mocks/loggedin.json), stored the way save_progress stores it.
$insertUser->execute([seed_env('SEED_LEARNER_EMAIL'), $passwordHash, seed_env('SEED_LEARNER_USERNAME'), '25-34', $notifications]);
$learnerId = (int)$pdo->lastInsertId();
$insertProgress->execute([
    $learnerId,
    1240,
    json_encode(['node1_ordering_a_drink' => true, 'node2_beverages' => true, 'node3_numbers' => true]),
    json_encode([
        'bones' => 180,
        'streak_count' => 12,
        'streak_shields' => 2,
        'level' => 3,
        'achievements' => ['first_lesson', 'flawless'],
        'node_state' => [
            'node1_ordering_a_drink' => $allLessons,
            'node2_beverages' => $allLessons,
            'chest_Module_1' => ['completedLessons' => ['chest_opened']],
            'node3_numbers' => $allLessons,
            'node4_introductions' => ['completedLessons' => ['lesson_1', 'lesson_2']]
        ],
        'earned_xp_per_node' => ['node1_ordering_a_drink' => 60, 'node2_beverages' => 55]
    ]),
    3,
    12,
    2,
    date('Y-m-d', strtotime('-1 day'))
]);
$insertSubscription->execute([$learnerId]);
$pdo->prepare('INSERT INTO user_leagues (user_id, league_id, weekly_xp, monthly_xp) VALUES (?, 2, 310, 310)')->execute([$learnerId]);

// A brand-new learner: exactly the rows handleSignup writes.
$insertUser->execute([seed_env('SEED_NEW_EMAIL'), $passwordHash, seed_env('SEED_NEW_USERNAME'), 'unknown', null]);
$newId = (int)$pdo->lastInsertId();
$insertProgress->execute([$newId, 0, '{}', '{}', 1, 0, 2, null]);
$insertSubscription->execute([$newId]);

// An unused invite code, hashed the way lockBetaInviteForSignup looks it up.
$pdo->prepare("INSERT INTO beta_invites (email, invite_code_hash, invited_by) VALUES (NULL, ?, 'local_stack')")
    ->execute([hash('sha256', strtoupper(trim(seed_env('SEED_INVITE_CODE'))))]);

// Weak words for the returning learner: real curriculum items, stored in the
// shape LessonPlayer posts to log_failed_exercise.
$nodeFile = $repoRoot . '/data/hu/A1/Module_1_Hello_World/node1_ordering_a_drink.json';
$node = json_decode((string)file_get_contents($nodeFile), true);
$items = array_slice($node['lessons'][0]['items'] ?? [], 0, 5);
if (count($items) < 5) {
    throw new RuntimeException("Expected at least five exercises in $nodeFile.");
}
$insertFailed = $pdo->prepare('INSERT INTO user_failed_exercises (user_id, level, exercise_id, question_data, fail_count) VALUES (?, ?, ?, ?, ?)');
foreach ([4, 3, 2, 2, 1] as $index => $failCount) {
    $insertFailed->execute([$learnerId, 'A1', $items[$index]['id'], json_encode($items[$index], JSON_UNESCAPED_UNICODE), $failCount]);
}

$pdo->commit();

echo "Seeded users $learnerId and $newId, one invite code and 5 weak-word rows.\n";
