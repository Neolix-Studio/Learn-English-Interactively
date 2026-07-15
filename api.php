<?php
require_once __DIR__ . '/security.php';
ini_set('session.cookie_lifetime', 60 * 60 * 24 * 30);
ini_set('session.gc_maxlifetime', 60 * 60 * 24 * 30);
security_start_session();

// CORS Configuration
$allowed_origins = [
    'https://dev.lexipaws.eu',
    'https://lexipaws.eu',
    'https://www.lexipaws.eu',
    'https://lexipaws.hu',
    'https://lexipaws.sk',
    'https://neolix.studio',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
}

security_validate_same_origin($allowed_origins);

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// Include database configuration
if (!file_exists(__DIR__ . '/db_config.php')) {
    echo json_encode(['error' => 'Database configuration file is missing. Please create db_config.php.']);
    exit;
}
require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/mailer.php';

// Constants
define('PASSWORD_REGEX', '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,16}$/');
define('PASSWORD_ERR_MSG', 'A jelszónak 8-16 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt, számot és speciális karaktert.');
define('APP_ALLOWED_HOSTS', ['dev.lexipaws.eu', 'lexipaws.eu', 'www.lexipaws.eu', 'lexipaws.hu', 'lexipaws.sk', 'neolix.studio', 'localhost', 'localhost:3000', 'localhost:5173', 'localhost:8080']);

// Initialize Database Connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    echo json_encode(['error' => 'Hiba történt az adatbázis csatlakozás során.']);
    exit;
}

// Read JSON input payloads (from POST requests)
$inputData = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}

// Router
$action = isset($_GET['action']) ? $_GET['action'] : '';

$csrfExemptActions = [
    'csrf_token',
    'signup',
    'login',
    'forgot_password',
    'reset_password',
    'get_session',
    'get_leaderboard',
    'search_leaderboard',
    'get_weak_words'
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && !in_array($action, $csrfExemptActions, true)) {
    security_validate_csrf();
}

switch ($action) {
    case 'csrf_token':
        echo json_encode(['success' => true, 'csrf_token' => security_get_csrf_token()]);
        break;

    case 'signup':
        handleSignup($pdo, $inputData);
        break;

    case 'login':
        handleLogin($pdo, $inputData);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'get_session':
        handleGetSession($pdo);
        break;

    case 'save_progress':
        handleSaveProgress($pdo, $inputData);
        break;

    case 'log_failed_exercise':
        handleLogFailedExercise($pdo, $inputData);
        break;

    case 'get_weak_words':
        handleGetWeakWords($pdo);
        break;

    case 'update_password':
        handleUpdatePassword($pdo, $inputData);
        break;

    case 'forgot_password':
        handleForgotPassword($pdo, $inputData);
        break;

    case 'reset_password':
        handleResetPassword($pdo, $inputData);
        break;

    case 'get_leaderboard':
        handleGetLeaderboard($pdo);
        break;
    case 'search_leaderboard':
        handleSearchLeaderboard($pdo);
        break;
    case 'get_pending_rewards':
        handleGetPendingRewards($pdo);
        break;
    case 'buy_cosmetic':
        handleBuyCosmetic($pdo, $inputData);
        break;
    case 'claim_reward':
        handleClaimReward($pdo);
        break;
    case 'update_progress':
        handleUpdateProgress($pdo, $inputData);
        break;
    case 'get_vocabulary':
        handleGetVocabulary($pdo);
        break;
    case 'sync_vocabulary':
        handleSyncVocabulary($pdo, $inputData);
        break;
    case 'update_preferences':
        handleUpdatePreferences($pdo, $inputData);
        break;

    case 'send_friend_request':
        handleSendFriendRequest($pdo, $inputData);
        break;
    case 'accept_friend_request':
        handleAcceptFriendRequest($pdo, $inputData);
        break;
    case 'remove_friend':
        handleRemoveFriend($pdo, $inputData);
        break;
    case 'get_friends':
        handleGetFriends($pdo);
        break;

    case 'submit_feedback':
        handleSubmitFeedback($pdo, $inputData);
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

// --- API ACTIONS HANDLERS ---

function getAppBaseUrl(): string {
    $configured = getenv('APP_BASE_URL');
    if (!$configured && defined('APP_BASE_URL')) {
        $configured = APP_BASE_URL;
    }

    if ($configured) {
        $parts = parse_url($configured);
        $scheme = $parts['scheme'] ?? '';
        $host = $parts['host'] ?? '';
        if (in_array($scheme, ['https', 'http'], true) && in_array($host, APP_ALLOWED_HOSTS, true)) {
            return rtrim($configured, '/');
        }
    }

    $host = $_SERVER['HTTP_HOST'] ?? 'lexipaws.eu';
    if (!in_array($host, APP_ALLOWED_HOSTS, true)) {
        $host = 'lexipaws.eu';
    }

    $scheme = str_starts_with($host, 'localhost') ? 'http' : 'https';
    return $scheme . '://' . $host;
}

function hashPasswordResetToken(string $token): string {
    return hash('sha256', $token);
}

// 1. Sign Up
function validateSignupData(PDO $pdo, string $email, string $password, string $username) {
    if (empty($email) || empty($password) || empty($username)) {
        return 'Minden mező kitöltése kötelező (felhasználónév, e-mail, jelszó)!';
    }
    if (mb_strlen($username) > 50) {
        return 'A felhasználónév maximum 50 karakter hosszú lehet!';
    }
    if (mb_strlen($email) > 100) {
        return 'Az e-mail cím maximum 100 karakter hosszú lehet!';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Érvénytelen e-mail cím formátum!';
    }
    if (!preg_match(PASSWORD_REGEX, $password)) {
        return PASSWORD_ERR_MSG;
    }
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        return 'Ez az e-mail cím már regisztrálva van!';
    }
    // Check if username already exists
    $stmtUser = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmtUser->execute([$username]);
    if ($stmtUser->fetch()) {
        return 'Ez a felhasználónév már foglalt!';
    }
    return null;
}

function handleSignup(PDO $pdo, array $data) {
    if (!security_rate_limit('signup_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 5, 3600)) {
        http_response_code(429);
        echo json_encode(['error' => 'Túl sok regisztrációs próbálkozás. Kérjük, próbáld újra később.']);
        return;
    }

    $email = isset($data['email']) ? trim($data['email']) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $username = isset($data['username']) ? trim($data['username']) : '';
    $ageRange = isset($data['age_range']) ? trim($data['age_range']) : 'unknown';
    $baseLanguage = isset($data['base_language']) ? trim($data['base_language']) : 'hu';
    $guestMigration = isset($data['guest_migration']) ? $data['guest_migration'] : [];
    $marketingData = isset($data['marketing_data']) && !empty($data['marketing_data']) ? json_encode($data['marketing_data']) : null;

    try {
        $validationError = validateSignupData($pdo, $email, $password, $username);
        if ($validationError) {
            echo json_encode(['error' => $validationError]);
            return;
        }

        // Insert new user
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, username, age_range, marketing_data, base_language) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$email, $passwordHash, $username, $ageRange, $marketingData, $baseLanguage]);
        $userId = $pdo->lastInsertId();

        // Migrate guest progress data if available
        $points = isset($guestMigration['points']) ? intval($guestMigration['points']) : 0;
        $completed = isset($guestMigration['completed']) ? json_encode($guestMigration['completed']) : json_encode(new stdClass());
        $scores = isset($guestMigration['scores']) ? json_encode($guestMigration['scores']) : json_encode(new stdClass());

        // Create user_progress (with default gamification values)
        $stmtProgress = $pdo->prepare("INSERT INTO user_progress
            (user_id, points, completed, scores, level, streak_count, streak_shields, active_theme)
            VALUES (?, ?, ?, ?, 1, 0, 2, 'system')");
        $stmtProgress->execute([$userId, $points, $completed, $scores]);

        // Create default free subscription
        $stmtSub = $pdo->prepare("INSERT INTO user_subscriptions (user_id, role, subscription_tier) VALUES (?, 'user', 'free')");
        $stmtSub->execute([$userId]);

        $pdo->commit();

        // --- Send Welcome Email ---
        sendTemplateEmail($email, 'welcome', [
            'username' => $username,
            'language' => $baseLanguage
        ]);
        // --------------------------

        // Establish PHP session right away (direct sign-up)
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['email'] = $email;

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'username' => htmlspecialchars($username, ENT_QUOTES, 'UTF-8'),
                'age_range' => $ageRange,
                'base_language' => $baseLanguage
            ]
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Registration error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a regisztráció során. Kérjük, próbáld újra később.']);
    }
}

function hasGuestMigrationData(array $guestMigration) {
    $points = isset($guestMigration['points']) ? intval($guestMigration['points']) : 0;
    $completed = isset($guestMigration['completed']) && is_array($guestMigration['completed']) ? $guestMigration['completed'] : [];
    $scores = isset($guestMigration['scores']) && is_array($guestMigration['scores']) ? $guestMigration['scores'] : [];

    return $points > 0 || !empty($completed) || !empty($scores);
}

function decodeProgressJson($value) {
    if (empty($value)) {
        return [];
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function isListArray(array $value) {
    if (function_exists('array_is_list')) {
        return array_is_list($value);
    }

    return array_keys($value) === range(0, count($value) - 1);
}

function mergeProgressValue($current, $incoming) {
    if (is_array($current) && is_array($incoming)) {
        if (isListArray($current) && isListArray($incoming)) {
            return array_values(array_unique(array_merge($current, $incoming), SORT_REGULAR));
        }

        $merged = $current;
        foreach ($incoming as $key => $incomingValue) {
            if (array_key_exists($key, $merged)) {
                $merged[$key] = mergeProgressValue($merged[$key], $incomingValue);
            } else {
                $merged[$key] = $incomingValue;
            }
        }
        return $merged;
    }

    if (is_numeric($current) && is_numeric($incoming)) {
        return max($current, $incoming);
    }

    if ($incoming === null || $incoming === '') {
        return $current;
    }

    return $incoming;
}

function mergeGuestProgressIntoUser(PDO $pdo, int $userId, array $guestMigration) {
    if (!hasGuestMigrationData($guestMigration)) {
        return;
    }

    $guestPoints = max(0, intval($guestMigration['points'] ?? 0));
    $guestCompleted = isset($guestMigration['completed']) && is_array($guestMigration['completed']) ? $guestMigration['completed'] : [];
    $guestScores = isset($guestMigration['scores']) && is_array($guestMigration['scores']) ? $guestMigration['scores'] : [];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT points, completed, scores FROM user_progress WHERE user_id = ? FOR UPDATE");
        $stmt->execute([$userId]);
        $progress = $stmt->fetch();

        if (!$progress) {
            $stmtInsert = $pdo->prepare("INSERT INTO user_progress
                (user_id, points, completed, scores, level, streak_count, streak_shields, active_theme)
                VALUES (?, ?, ?, ?, 1, 0, 2, 'system')");
            $stmtInsert->execute([
                $userId,
                $guestPoints,
                json_encode($guestCompleted),
                json_encode($guestScores)
            ]);
            $pdo->commit();
            return;
        }

        $mergedPoints = max(intval($progress['points'] ?? 0), $guestPoints);
        $mergedCompleted = mergeProgressValue(decodeProgressJson($progress['completed'] ?? ''), $guestCompleted);
        $mergedScores = mergeProgressValue(decodeProgressJson($progress['scores'] ?? ''), $guestScores);

        $stmtUpdate = $pdo->prepare("UPDATE user_progress SET points = ?, completed = ?, scores = ? WHERE user_id = ?");
        $stmtUpdate->execute([
            $mergedPoints,
            json_encode($mergedCompleted),
            json_encode($mergedScores),
            $userId
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

// 2. Log In
function handleLogin(PDO $pdo, array $data) {
    if (!security_rate_limit('login_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 900)) {
        http_response_code(429);
        echo json_encode(['error' => 'Túl sok bejelentkezési próbálkozás. Kérjük, próbáld újra később.']);
        return;
    }

    $email = isset($data['email']) ? trim($data['email']) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $guestMigration = isset($data['guest_migration']) && is_array($data['guest_migration']) ? $data['guest_migration'] : [];

    if (empty($email) || empty($password)) {
        echo json_encode(['error' => 'Add meg az e-mail címed és a jelszavad!']);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, email, password_hash, username, age_range, base_language FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            echo json_encode(['error' => 'Hibás e-mail cím vagy jelszó!']);
            return;
        }

        // Establish session
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];

        // Update last login & reset inactivity nudges
        $stmtUpdateLogin = $pdo->prepare("UPDATE users SET last_login_at = NOW(), inactivity_email_count = 0 WHERE id = ?");
        $stmtUpdateLogin->execute([$user['id']]);
        mergeGuestProgressIntoUser($pdo, intval($user['id']), $guestMigration);

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8'),
                'age_range' => $user['age_range'],
                'base_language' => $user['base_language'] ?? 'hu'
            ]
        ]);

    } catch (Exception $e) {
        error_log('Login error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a bejelentkezés során. Kérjük, próbáld újra később.']);
    }
}

// 3. Log Out
function handleLogout() {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    echo json_encode(['success' => true]);
}

// 4. Get Current Session State (Retrieves user data + progress details)
function formatUserProgress(array $progress) {
    if (!$progress) {
        return [
            'points' => 0,
            'completed' => new stdClass(),
            'scores' => new stdClass(),
            'level' => 1,
            'streak_count' => 0,
            'streak_shields' => 0,
            'last_active_date' => null,
            'unlocked_items' => [],
            'active_theme' => 'default',
            'earned_xp_per_node' => new stdClass(),
            'daily_quests_date' => null,
            'active_quests' => [],
            'quest_progress' => new stdClass(),
            'completed_quests_today' => []
        ];
    }
    return [
        'points' => intval($progress['points']),
        'completed' => !empty($progress['completed']) ? json_decode($progress['completed']) : new stdClass(),
        'scores' => !empty($progress['scores']) ? json_decode($progress['scores']) : new stdClass(),
        'level' => intval($progress['level']),
        'streak_count' => intval($progress['streak_count']),
        'streak_shields' => intval($progress['streak_shields']),
        'last_active_date' => $progress['last_active_date'],
        'unlocked_items' => !empty($progress['unlocked_items']) ? json_decode($progress['unlocked_items']) : [],
        'active_theme' => $progress['active_theme'],
        'earned_xp_per_node' => !empty($progress['earned_xp_per_node']) ? json_decode($progress['earned_xp_per_node']) : new stdClass(),
        'daily_quests_date' => $progress['daily_quests_date'],
        'active_quests' => !empty($progress['active_quests']) ? json_decode($progress['active_quests']) : [],
        'quest_progress' => !empty($progress['quest_progress']) ? json_decode($progress['quest_progress']) : new stdClass(),
        'completed_quests_today' => !empty($progress['completed_quests_today']) ? json_decode($progress['completed_quests_today']) : [],
        'energy' => isset($progress['energy']) ? intval($progress['energy']) : 5,
        'last_energy_refill' => !empty($progress['last_energy_refill']) ? $progress['last_energy_refill'] : date('Y-m-d H:i:s')
    ];
}

// 4. Get Current Session State (Retrieves user data + progress details)
function handleUpdateAvatar(PDO $pdo, array $inputData) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Not logged in"]);
        return;
    }

    $userId = $_SESSION['user_id'];
    $avatar = trim($inputData['avatar'] ?? '');

    if (empty($avatar)) {
        echo json_encode(["status" => "error", "message" => "Avatar name required"]);
        return;
    }

    $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
    if ($stmt->execute([$avatar, $userId])) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update avatar"]);
    }
}

// ==========================================
// SRS / Weak Words endpoints
// ==========================================

function handleLogFailedExercise(PDO $pdo, array $inputData) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Not logged in"]);
        return;
    }

    $userId = $_SESSION['user_id'];
    $level = $inputData['level'] ?? 'A1';
    $exerciseId = $inputData['exercise_id'] ?? '';
    $questionData = json_encode($inputData['question_data'] ?? []);

    if (empty($exerciseId)) {
        echo json_encode(["status" => "error", "message" => "Missing exercise_id"]);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO user_failed_exercises (user_id, level, exercise_id, question_data, fail_count)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            fail_count = fail_count + 1,
            question_data = VALUES(question_data)
    ");

    if ($stmt->execute([$userId, $level, $exerciseId, $questionData])) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to log exercise"]);
    }
}

function handleGetWeakWords(PDO $pdo) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Not logged in"]);
        return;
    }

    $userId = $_SESSION['user_id'];
    $level = $_GET['level'] ?? 'A1';
    $limit = (int)($_GET['limit'] ?? 10);

    $stmt = $pdo->prepare("
        SELECT exercise_id, question_data, fail_count
        FROM user_failed_exercises
        WHERE user_id = ? AND level = ?
        ORDER BY fail_count DESC, last_failed_at ASC
        LIMIT ?
    ");

    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $level, PDO::PARAM_STR);
    $stmt->bindValue(3, $limit, PDO::PARAM_INT);
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decode JSON strings back to objects
    foreach ($results as &$row) {
        $row['question_data'] = json_decode($row['question_data'], true);
    }

    echo json_encode(["status" => "success", "data" => $results]);
}


function getUnlockedThemes(PDO $pdo, $userId) {
    $stmt = $pdo->prepare("SELECT item_id FROM user_inventory WHERE user_id = ? AND item_type = 'theme'");
    $stmt->execute([$userId]);
    $themes = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $defaultThemes = ['system', 'light', 'dark'];
    return array_values(array_unique(array_merge($defaultThemes, $themes)));
}

function handleGetSession(PDO $pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['session' => null]);
        return;
    }

    $userId = $_SESSION['user_id'];

    try {
        // Load User main details
        $stmtUser = $pdo->prepare("SELECT email, username, age_range, avatar, notification_preferences, base_language FROM users WHERE id = ?");
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch();

        if (!$user) {
            // Clean up invalid session
            session_destroy();
            echo json_encode(['session' => null]);
            return;
        }

        // Load progress details
        $stmtProgress = $pdo->prepare("SELECT points, completed, scores, level, streak_count, streak_shields, last_active_date, unlocked_items, active_theme, earned_xp_per_node, daily_quests_date, active_quests, quest_progress, completed_quests_today, energy, last_energy_refill FROM user_progress WHERE user_id = ?");
        $stmtProgress->execute([$userId]);
        $progress = $stmtProgress->fetch();
        $unlockedThemes = getUnlockedThemes($pdo, $userId);

        // Load subscription details
        $stmtSub = $pdo->prepare("SELECT role, subscription_tier FROM user_subscriptions WHERE user_id = ?");
        $stmtSub->execute([$userId]);
        $sub = $stmtSub->fetch();

        echo json_encode([
            'session' => [
                'user' => [
                    'id' => $userId,
                    'email' => $user['email'],
                    'user_metadata' => [
                        'username' => htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8'),
                        'age_range' => $user['age_range'],
                        'avatar' => $user['avatar'] ?? null,
                        'base_language' => $user['base_language'] ?? 'hu',
                        'notification_preferences' => $user['notification_preferences'] ? json_decode($user['notification_preferences'], true) : new stdClass()
                    ]
                ],
                'progress' => array_merge(formatUserProgress($progress), ['unlocked_themes' => $unlockedThemes]),
                'subscription' => [
                    'role' => $sub ? $sub['role'] : 'user',
                    'subscription_tier' => $sub ? $sub['subscription_tier'] : 'free'
                ]
            ]
        ]);

    } catch (Exception $e) {
        error_log('Session load error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba a munkamenet betöltésekor. Kérjük, próbáld újra később.']);
    }
}

function parseProgressData(array $data) {
    return [
        'points' => isset($data['points']) ? intval($data['points']) : 0,
        'completed' => isset($data['completed']) ? json_encode($data['completed']) : json_encode(new stdClass()),
        'scores' => isset($data['scores']) ? json_encode($data['scores']) : json_encode(new stdClass()),
        'level' => isset($data['level']) ? intval($data['level']) : 1,
        'streak_count' => isset($data['streak_count']) ? intval($data['streak_count']) : 0,
        'streak_shields' => isset($data['streak_shields']) ? intval($data['streak_shields']) : 0,
        'last_active_date' => !empty($data['last_active_date']) ? $data['last_active_date'] : null,
        'unlocked_items' => isset($data['unlocked_items']) ? json_encode($data['unlocked_items']) : json_encode([]),
        'active_theme' => !empty($data['active_theme']) ? $data['active_theme'] : 'default',
        'earned_xp_per_node' => isset($data['earned_xp_per_node']) ? json_encode($data['earned_xp_per_node']) : json_encode(new stdClass()),
        'daily_quests_date' => !empty($data['daily_quests_date']) ? $data['daily_quests_date'] : null,
        'active_quests' => isset($data['active_quests']) ? json_encode($data['active_quests']) : json_encode([]),
        'quest_progress' => isset($data['quest_progress']) ? json_encode($data['quest_progress']) : json_encode(new stdClass()),
        'completed_quests_today' => isset($data['completed_quests_today']) ? json_encode($data['completed_quests_today']) : json_encode([]),
        'energy' => isset($data['energy']) ? intval($data['energy']) : 5,
        'last_energy_refill' => !empty($data['last_energy_refill']) ? $data['last_energy_refill'] : date('Y-m-d H:i:s')
    ];
}

// 5. Save Progress
function handleSaveProgress(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Munkamenet lejárt! Kérjük, jelentkezz be újra.']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $parsed = parseProgressData($data);

    try {
        // SECURITY CHECK & MILESTONE DATA FETCH
        $stmtCheck = $pdo->prepare("
            SELECT up.scores, up.points, up.streak_count, u.email, u.username, u.marketing_data, u.notification_preferences, u.base_language
            FROM user_progress up
            JOIN users u ON u.id = up.user_id
            WHERE up.user_id = ?
        ");
	        $stmtCheck->execute([$userId]);
	        $currentDbProgress = $stmtCheck->fetch();

            if ($currentDbProgress && isset($currentDbProgress['points'])) {
                $currentPoints = intval($currentDbProgress['points']);
                if ($parsed['points'] < $currentPoints) {
                    $parsed['points'] = $currentPoints;
                }
                if ($parsed['points'] > $currentPoints + 100) {
                    error_log("Security: User $userId attempted excessive point increase. Capped.");
                    $parsed['points'] = $currentPoints + 100;
                }
            }

            $parsed['energy'] = max(0, min(5, intval($parsed['energy'])));

	        if ($currentDbProgress && !empty($currentDbProgress['scores'])) {
	            $currentScores = json_decode($currentDbProgress['scores'], true);
	            $incomingScores = json_decode($parsed['scores'], true);
                if (!is_array($currentScores)) $currentScores = [];
                if (!is_array($incomingScores)) $incomingScores = [];

                $currentBones = intval($currentScores['bones'] ?? 0);
                $incomingBones = intval($incomingScores['bones'] ?? $currentBones);
                if ($incomingBones < $currentBones) {
                    $incomingScores['bones'] = $incomingBones;
                } elseif ($incomingBones > $currentBones + 100) {
                    error_log("Security: User $userId attempted excessive bones increase. Capped.");
                    $incomingScores['bones'] = $currentBones + 100;
                }

                $currentShields = intval($currentScores['streak_shields'] ?? 0);
                $incomingShields = intval($incomingScores['streak_shields'] ?? $currentShields);
                if ($incomingShields > $currentShields + 3) {
                    $incomingScores['streak_shields'] = $currentShields + 3;
                }

		            if (isset($incomingScores['node_state']) && is_array($incomingScores['node_state'])) {
	                foreach ($incomingScores['node_state'] as $nodeId => $nodeData) {
                    $incomingLevel = isset($nodeData['current_level']) ? intval($nodeData['current_level']) : 1;
                    $currentLevel = 1;

                    if (isset($currentScores['node_state'][$nodeId]['current_level'])) {
                        $currentLevel = intval($currentScores['node_state'][$nodeId]['current_level']);
                    }

                    // Allow replay of same level, or advancing by exactly 1 level.
                    // If they try to skip ahead by more than 1, we block it.
                    if ($incomingLevel > $currentLevel + 1) {
                        error_log("Security: User $userId attempted to skip $nodeId from $currentLevel to $incomingLevel. Blocked.");
                        // Force it back to current valid state
                        $incomingScores['node_state'][$nodeId]['current_level'] = $currentLevel;
                    }
		            }
                }

	                $parsed['scores'] = json_encode($incomingScores);
		        }

        $stmt = $pdo->prepare("INSERT INTO user_progress
            (user_id, points, completed, scores, level, streak_count, streak_shields, last_active_date, unlocked_items, active_theme, earned_xp_per_node, daily_quests_date, active_quests, quest_progress, completed_quests_today, energy, last_energy_refill)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            points = VALUES(points),
            completed = VALUES(completed),
            scores = VALUES(scores),
            level = VALUES(level),
            streak_count = VALUES(streak_count),
            streak_shields = VALUES(streak_shields),
            last_active_date = VALUES(last_active_date),
            unlocked_items = VALUES(unlocked_items),
            active_theme = VALUES(active_theme),
            earned_xp_per_node = VALUES(earned_xp_per_node),
            daily_quests_date = VALUES(daily_quests_date),
            active_quests = VALUES(active_quests),
            quest_progress = VALUES(quest_progress),
            completed_quests_today = VALUES(completed_quests_today),
            energy = VALUES(energy),
            last_energy_refill = VALUES(last_energy_refill)");

        $stmt->execute([
            $userId, $parsed['points'], $parsed['completed'], $parsed['scores'],
            $parsed['level'], $parsed['streak_count'], $parsed['streak_shields'], $parsed['last_active_date'], $parsed['unlocked_items'], $parsed['active_theme'], $parsed['earned_xp_per_node'],
            $parsed['daily_quests_date'], $parsed['active_quests'], $parsed['quest_progress'], $parsed['completed_quests_today'],
            $parsed['energy'], $parsed['last_energy_refill']
        ]);

        // Calculate XP earned to update leagues
        $xpEarned = 0;
        if ($currentDbProgress && isset($currentDbProgress['points'])) {
            $xpEarned = max(0, $parsed['points'] - intval($currentDbProgress['points']));
        } else {
            $xpEarned = $parsed['points'];
        }

        if ($xpEarned > 0) {
            // Determine league based on total points
            $leagueId = 1; // Bronze
            if ($parsed['points'] >= 5000) $leagueId = 4; // Diamond
            elseif ($parsed['points'] >= 1500) $leagueId = 3; // Gold
            elseif ($parsed['points'] >= 500) $leagueId = 2; // Silver

            $stmtLeague = $pdo->prepare("INSERT INTO user_leagues
                (user_id, league_id, weekly_xp, monthly_xp)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                league_id = ?,
                weekly_xp = weekly_xp + ?,
                monthly_xp = monthly_xp + ?");
            $stmtLeague->execute([
                $userId, $leagueId, $xpEarned, $xpEarned,
                $leagueId, $xpEarned, $xpEarned
            ]);
        }

        // --- MILESTONE LOGIC (Streak) ---
        if ($currentDbProgress && isset($currentDbProgress['streak_count'])) {
            $oldStreak = intval($currentDbProgress['streak_count']);
            $newStreak = intval($parsed['streak_count']);

            $milestones = [7, 30, 100];

            $prefs = json_decode($currentDbProgress['notification_preferences'] ?? '{}', true);
            $milestonePref = $prefs['milestones'] ?? true;

            // Check if they just hit a standard milestone
            if ($milestonePref && $newStreak > $oldStreak && in_array($newStreak, $milestones)) {
                sendTemplateEmail($currentDbProgress['email'], 'milestone', [
                    'username' => $currentDbProgress['username'],
                    'milestoneMessage' => $newStreak . " NAPOS TANULÁSI SOROZAT!",
                    'language' => $currentDbProgress['base_language'] ?? 'hu'
                ]);
            }

            // Check FTUE commitment milestone
            // Marketing data contains onboarding answers.
            if ($currentDbProgress['marketing_data'] && $newStreak > $oldStreak) {
                $marketingData = json_decode($currentDbProgress['marketing_data'], true);
                // The FTUE questions are stored here. For example 'streak_commitment' might be "7 days" or just "7".
                // We will parse it simply by finding the number.
                if (isset($marketingData['streak_commitment'])) {
                    preg_match('/\d+/', $marketingData['streak_commitment'], $matches);
                    if (!empty($matches)) {
                        $committedStreak = intval($matches[0]);
                        if ($milestonePref && $newStreak === $committedStreak) {
                            sendTemplateEmail($currentDbProgress['email'], 'milestone', [
                                'username' => $currentDbProgress['username'],
                                'milestoneMessage' => "ELÉRTED A VÁLLALT " . $committedStreak . " NAPOS CÉLODAT!",
                                'language' => $currentDbProgress['base_language'] ?? 'hu'
                            ]);
                        }
                    }
                }
            }
        }
        // --------------------------------

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        error_log('Progress save error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba a mentés során. Kérjük, próbáld újra később.']);
    }
}

// 5.b. Update Progress (XP only)
function handleUpdateProgress(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Munkamenet lejárt!']);
        return;
    }

	    $userId = $_SESSION['user_id'];
	    $xpToAdd = isset($data['xp']) ? intval($data['xp']) : 0;
        if ($xpToAdd > 100) {
            error_log("Security: User $userId attempted excessive XP add. Capped.");
            $xpToAdd = 100;
        }

    if ($xpToAdd > 0) {
        try {
            // Update user's points in user_progress
            $stmt = $pdo->prepare("UPDATE user_progress SET points = points + ? WHERE user_id = ?");
            $stmt->execute([$xpToAdd, $userId]);

            // Get total points to determine league
            $stmtPoints = $pdo->prepare("SELECT points FROM user_progress WHERE user_id = ?");
            $stmtPoints->execute([$userId]);
            $totalPoints = $stmtPoints->fetchColumn();

            $leagueId = 1; // Bronze
            if ($totalPoints >= 5000) $leagueId = 4; // Diamond
            elseif ($totalPoints >= 1500) $leagueId = 3; // Gold
            elseif ($totalPoints >= 500) $leagueId = 2; // Silver

            // Update user_leagues
            $stmtLeague = $pdo->prepare("INSERT INTO user_leagues
                (user_id, league_id, weekly_xp, monthly_xp)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                league_id = ?,
                weekly_xp = weekly_xp + ?,
                monthly_xp = monthly_xp + ?");
            $stmtLeague->execute([
                $userId, $leagueId, $xpToAdd, $xpToAdd,
                $leagueId, $xpToAdd, $xpToAdd
            ]);

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            error_log('Update progress error: ' . $e->getMessage());
            echo json_encode(['error' => 'Hiba történt a fejlődés frissítésekor.']);
        }
    } else {
        echo json_encode(['error' => 'Nincs XP megadva.']);
    }
}

// 6. Update Password (profile page password change verification)
function handleUpdatePassword(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Munkamenet lejárt! Kérjük, jelentkezz be újra.']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $currentPassword = isset($data['current_password']) ? $data['current_password'] : '';
    $newPassword = isset($data['new_password']) ? $data['new_password'] : '';

    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode(['error' => 'A jelenlegi és az új jelszót is meg kell adni!']);
        return;
    }

    if (!preg_match(PASSWORD_REGEX, $newPassword)) {
        echo json_encode(['error' => PASSWORD_ERR_MSG]);
        return;
    }

    try {
        // Verify current password first
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            echo json_encode(['error' => 'A jelenlegi jelszó helytelen!']);
            return;
        }

        // Update to new password
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmtUpdate = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmtUpdate->execute([$newHash, $userId]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        error_log('Password update error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba a jelszó módosításakor. Kérjük, próbáld újra később.']);
    }
}

// 7. Request Forgot Password (generates token and mails it)
function handleForgotPassword(PDO $pdo, array $data) {
    if (!security_rate_limit('forgot_password_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 5, 3600)) {
        http_response_code(429);
        echo json_encode(['error' => 'Túl sok kérés. Kérjük, próbáld újra később.']);
        return;
    }

    $email = isset($data['email']) ? trim($data['email']) : '';

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['error' => 'Adj meg egy érvényes e-mail címet!']);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, username, base_language FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Security best practice: don't explicitly say "email does not exist"
            // to avoid email harvesting, just return success.
            echo json_encode(['success' => true, 'message' => 'Ha az e-mail cím létezik a rendszerünkben, kiküldtük a visszaállítási linket.']);
            return;
        }

        // Generate token and expiry (1 hour)
        $token = bin2hex(random_bytes(32));
        $tokenHash = hashPasswordResetToken($token);
        $expiry = date('Y-m-d H:i:s', time() + 3600);

        // Store only a token hash. The raw token exists only in the email link.
        $stmtUpdate = $pdo->prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?");
        $stmtUpdate->execute([$tokenHash, $expiry, $user['id']]);

        $resetLink = getAppBaseUrl() . "/index.html?" . http_build_query([
            'action' => 'reset_password',
            'token' => $token
        ]);

        // Email details
        $to = $email;

        // Send email using our new HTML template
        if (sendTemplateEmail($to, 'password_reset', ['username' => $user['username'], 'resetLink' => $resetLink, 'language' => $user['base_language'] ?? 'hu'])) {
            echo json_encode(['success' => true, 'message' => 'Ha az e-mail cím létezik a rendszerünkben, kiküldtük a visszaállítási linket.']);
        } else {
            echo json_encode(['error' => 'Nem sikerült elküldeni az e-mailt. Kérjük, próbáld meg később.']);
        }

    } catch (Exception $e) {
        error_log('Forgot password error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a kérelem feldolgozása során. Kérjük, próbáld újra később.']);
    }
}

// 8. Execute Reset Password via Token
function handleResetPassword(PDO $pdo, array $data) {
    if (!security_rate_limit('reset_password_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 900)) {
        http_response_code(429);
        echo json_encode(['error' => 'Túl sok jelszó-visszaállítási próbálkozás. Kérjük, próbáld újra később.']);
        return;
    }

    $token = isset($data['token']) ? trim($data['token']) : '';
    $newPassword = isset($data['password']) ? $data['password'] : ($data['new_password'] ?? '');

    if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
        echo json_encode(['error' => 'Hiányzó vagy érvénytelen visszaállítási token!']);
        return;
    }

    if (empty($newPassword) || !preg_match(PASSWORD_REGEX, $newPassword)) {
        echo json_encode(['error' => PASSWORD_ERR_MSG]);
        return;
    }

    try {
        // Find token and check expiry
        $tokenHash = hashPasswordResetToken($token);
        $stmt = $pdo->prepare("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()");
        $stmt->execute([$tokenHash]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['error' => 'A jelszó-visszaállítási link érvénytelen vagy már lejárt!']);
            return;
        }

        // Update password and clear token
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmtUpdate = $pdo->prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?");
        $stmtUpdate->execute([$passwordHash, $user['id']]);

        echo json_encode(['success' => true, 'message' => 'A jelszó sikeresen megváltoztatva! Most már bejelentkezhetsz.']);

    } catch (Exception $e) {
        error_log('Reset password error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a jelszó visszaállítása során. Kérjük, próbáld újra később.']);
    }
}

// 10. Get Leaderboard
function handleGetLeaderboard(PDO $pdo) {
    $timeframe = isset($_GET['timeframe']) ? $_GET['timeframe'] : 'weekly';
    $leagueId = isset($_GET['league_id']) ? intval($_GET['league_id']) : 1;
    $limit = $timeframe === 'monthly' ? 200 : 100;

    $xpColumn = $timeframe === 'monthly' ? 'monthly_xp' : 'weekly_xp';

    try {
        // Fetch top users in the specified league
        $stmt = $pdo->prepare("
            SELECT u.username, ul.$xpColumn as xp, up.active_title, up.active_border
            FROM users u
            JOIN user_leagues ul ON u.id = ul.user_id
            LEFT JOIN user_progress up ON u.id = up.user_id
            WHERE ul.league_id = :leagueId
            ORDER BY ul.$xpColumn DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':leagueId', $leagueId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch current user's rank if logged in
        $userRank = null;
        $userXp = null;
        if (isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id'];

            // Get user's XP and League
            $stmtUser = $pdo->prepare("SELECT league_id, $xpColumn as xp FROM user_leagues WHERE user_id = ?");
            $stmtUser->execute([$userId]);
            $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if ($userData && intval($userData['league_id']) === $leagueId) {
                $userXp = $userData['xp'];
                // Calculate Rank
                $stmtRank = $pdo->prepare("
                    SELECT COUNT(*) + 1 as rank
                    FROM user_leagues
                    WHERE league_id = ? AND $xpColumn > ?
                ");
                $stmtRank->execute([$leagueId, $userXp]);
                $userRank = $stmtRank->fetchColumn();
            }
        }

        echo json_encode([
            'success' => true,
            'leaderboard' => $leaderboard,
            'userRank' => $userRank,
            'userXp' => $userXp
        ]);
    } catch (PDOException $e) {
        error_log("Leaderboard error: " . $e->getMessage());
        echo json_encode(['error' => 'Hiba a ranglista lekérdezésekor.']);
    }
}

// 11. Search Leaderboard
function handleSearchLeaderboard(PDO $pdo) {
    if (!isset($_GET['username']) || !isset($_GET['timeframe']) || !isset($_GET['league_id'])) {
        echo json_encode(['error' => 'Hiányzó paraméterek.']);
        return;
    }

    $username = $_GET['username'];
    $timeframe = $_GET['timeframe'];
    $leagueId = intval($_GET['league_id']);
    $xpColumn = $timeframe === 'monthly' ? 'monthly_xp' : 'weekly_xp';

    try {
        $stmtUser = $pdo->prepare("
            SELECT ul.user_id, ul.$xpColumn as xp
            FROM users u
            JOIN user_leagues ul ON u.id = ul.user_id
            WHERE u.username = ? AND ul.league_id = ?
        ");
        $stmtUser->execute([$username, $leagueId]);
        $userData = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$userData) {
            echo json_encode(['success' => false, 'message' => 'Nem található ilyen felhasználó ebben a ligában.']);
            return;
        }

        $userXp = $userData['xp'];
        $stmtRank = $pdo->prepare("
            SELECT COUNT(*) + 1 as rank
            FROM user_leagues
            WHERE league_id = ? AND $xpColumn > ?
        ");
        $stmtRank->execute([$leagueId, $userXp]);
        $rank = $stmtRank->fetchColumn();

        echo json_encode([
            'success' => true,
            'rank' => $rank,
            'xp' => $userXp,
            'username' => $username
        ]);
    } catch (PDOException $e) {
        error_log("Search Leaderboard error: " . $e->getMessage());
        echo json_encode(['error' => 'Hiba a keresés során.']);
    }
}

function handleGetPendingRewards($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Nincs bejelentkezve']);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM user_rewards WHERE user_id = ? AND is_claimed = FALSE ORDER BY created_at ASC");
        $stmt->execute([$_SESSION['user_id']]);
        $rewards = $stmt->fetchAll();

        echo json_encode(['success' => true, 'rewards' => $rewards]);
    } catch (PDOException $e) {
        error_log("Get Rewards Error: " . $e->getMessage());
        echo json_encode(['error' => 'Database error']);
    }
}

function handleClaimReward($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Nincs bejelentkezve']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['reward_id'])) {
        echo json_encode(['error' => 'Missing reward_id']);
        return;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM user_rewards WHERE id = ? AND user_id = ? AND is_claimed = FALSE");
        $stmt->execute([$input['reward_id'], $_SESSION['user_id']]);
        $reward = $stmt->fetch();

        if (!$reward) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Reward not found or already claimed']);
            return;
        }

        $updateReward = $pdo->prepare("UPDATE user_rewards SET is_claimed = TRUE WHERE id = ?");
        $updateReward->execute([$reward['id']]);

        $stmtProgress = $pdo->prepare("SELECT scores, streak_shields, active_title FROM user_progress WHERE user_id = ?");
        $stmtProgress->execute([$_SESSION['user_id']]);
        $progress = $stmtProgress->fetch();
        $unlockedThemes = getUnlockedThemes($pdo, $_SESSION['user_id']);

        if ($progress) {
            $scores = json_decode($progress['scores'], true) ?: [];
            if (!isset($scores['bones'])) $scores['bones'] = 100;

            $scores['bones'] += (int)$reward['bones_reward'];
            $newShields = (int)$progress['streak_shields'] + (int)$reward['shields_reward'];

            $newTitle = $progress['active_title'];
            if (!empty($reward['title_reward'])) {
                $newTitle = $reward['title_reward'];
            }

            $updateProgress = $pdo->prepare("UPDATE user_progress SET scores = ?, streak_shields = ?, active_title = ? WHERE user_id = ?");
            $updateProgress->execute([json_encode($scores), $newShields, $newTitle, $_SESSION['user_id']]);
        }

        $pdo->commit();
        echo json_encode(['success' => true]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Claim Reward Error: " . $e->getMessage());
        echo json_encode(['error' => 'Database error']);
    }
}

function handleGetVocabulary($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $userId = $_SESSION['user_id'];

    $stmt = $pdo->prepare("SELECT word FROM user_vocabulary WHERE user_id = ?");
    $stmt->execute([$userId]);
    $words = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode(['success' => true, 'vocabulary' => $words]);
}

function handleSyncVocabulary($pdo, $inputData) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $words = isset($inputData['words']) ? $inputData['words'] : [];

    if (!is_array($words) || empty($words)) {
        echo json_encode(['success' => true, 'message' => 'No words to sync']);
        return;
    }

    $insertedCount = 0;

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT IGNORE INTO user_vocabulary (user_id, word) VALUES (?, ?)");

        foreach ($words as $word) {
            $cleanWord = mb_strtolower(trim($word));
            if (!empty($cleanWord)) {
                $stmt->execute([$userId, $cleanWord]);
                if ($stmt->rowCount() > 0) {
                    $insertedCount++;
                }
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'inserted_count' => $insertedCount]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}


function handleBuyCosmetic(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Munkamenet lejárt!']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $itemType = $data['item_type'] ?? '';
    $itemId = $data['item_id'] ?? '';
    $catalog = [
        'theme' => [
            'fall' => 200,
            'halloween' => 500
        ]
    ];
    $cost = $catalog[$itemType][$itemId] ?? 0;

    if (!$itemType || !$itemId || $cost <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Érvénytelen adatok']);
        return;
    }

    try {
        $pdo->beginTransaction();

        // Lock user progress to safely update bones
        $stmtProgress = $pdo->prepare("SELECT scores FROM user_progress WHERE user_id = ? FOR UPDATE");
        $stmtProgress->execute([$userId]);
        $progressRow = $stmtProgress->fetch();

        if (!$progressRow) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'User nem található']);
            return;
        }

        $scores = $progressRow['scores'] ? json_decode($progressRow['scores'], true) : [];
        $bones = isset($scores['bones']) ? (int)$scores['bones'] : 0;

        if ($bones < $cost) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'Nincs elég csontod!']);
            return;
        }

        // Deduct bones
        $scores['bones'] = $bones - $cost;
        $updateProgress = $pdo->prepare("UPDATE user_progress SET scores = ? WHERE user_id = ?");
        $updateProgress->execute([json_encode($scores), $userId]);

        // Insert into inventory
        $insertInv = $pdo->prepare("INSERT IGNORE INTO user_inventory (user_id, item_type, item_id) VALUES (?, ?, ?)");
        $insertInv->execute([$userId, $itemType, $itemId]);

        $pdo->commit();

        // Get updated unlocked themes
        $unlockedThemes = getUnlockedThemes($pdo, $userId);

        echo json_encode([
            'status' => 'success',
            'new_bones' => $scores['bones'],
            'unlocked_themes' => $unlockedThemes,
            'message' => 'Sikeres vásárlás!'
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Buy cosmetic error: ' . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Hiba történt a vásárlás során.']);
    }
}

// Update Notification Preferences
function handleUpdatePreferences(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Munkamenet lejárt!']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $prefs = isset($data['preferences']) ? $data['preferences'] : null;
    $baseLanguage = isset($data['base_language']) ? $data['base_language'] : null;

    try {
        if ($prefs !== null) {
            $stmt = $pdo->prepare("UPDATE users SET notification_preferences = ? WHERE id = ?");
            $stmt->execute([json_encode($prefs), $userId]);
        }
        if ($baseLanguage !== null) {
            $stmt = $pdo->prepare("UPDATE users SET base_language = ? WHERE id = ?");
            $stmt->execute([$baseLanguage, $userId]);
        }

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        error_log('Preferences update error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a beállítások mentésekor.']);
    }
}

function getOptionalConfigValue(string $name): string {
    $envValue = getenv($name);
    if ($envValue !== false && $envValue !== '') {
        return $envValue;
    }

    if (defined($name)) {
        return (string)constant($name);
    }

    return '';
}

function getFeedbackSlackWebhookUrl(): string {
    $feedbackWebhookUrl = getOptionalConfigValue('SLACK_WEBHOOK_URL_FEEDBACK');
    if ($feedbackWebhookUrl !== '') {
        return $feedbackWebhookUrl;
    }

    return getOptionalConfigValue('SLACK_WEBHOOK_URL');
}

function sanitizeFeedbackAnswers(array $answers): array {
    $cleanAnswers = [];

    foreach ($answers as $question => $answer) {
        $cleanQuestion = security_sanitize_log_line((string)$question, 200);
        $answerText = is_scalar($answer) ? (string)$answer : json_encode($answer);
        $cleanAnswer = security_sanitize_log_line($answerText, 1000);

        if ($cleanQuestion !== '') {
            $cleanAnswers[$cleanQuestion] = $cleanAnswer;
        }
    }

    return $cleanAnswers;
}

function applyFeedbackReward(PDO $pdo, int $userId, string $type): bool {
    if ($type === 'energy_refill') {
        $stmt = $pdo->prepare("SELECT last_feedback_refill FROM user_metadata WHERE user_id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && $row['last_feedback_refill']) {
            $lastRefill = new DateTime($row['last_feedback_refill']);
            $now = new DateTime();
            if (($now->getTimestamp() - $lastRefill->getTimestamp()) < 3600) {
                echo json_encode(['success' => false, 'error' => 'Cooldown active. Try again later.']);
                return false;
            }
        }

        $stmt = $pdo->prepare("UPDATE user_metadata SET last_feedback_refill = CURRENT_TIMESTAMP WHERE user_id = ?");
        $stmt->execute([$userId]);
        $stmtEnergy = $pdo->prepare("UPDATE user_progress SET energy = 5, last_energy_refill = NOW() WHERE user_id = ?");
        $stmtEnergy->execute([$userId]);
    }

    if ($type === 'widget') {
        $stmtProgress = $pdo->prepare("SELECT scores FROM user_progress WHERE user_id = ? FOR UPDATE");
        $pdo->beginTransaction();
        $stmtProgress->execute([$userId]);
        $progress = $stmtProgress->fetch(PDO::FETCH_ASSOC);
        $scores = [];

        if ($progress && $progress['scores']) {
            $decodedScores = json_decode($progress['scores'], true);
            $scores = is_array($decodedScores) ? $decodedScores : [];
        }

        $scores['bones'] = min(100000, (int)($scores['bones'] ?? 0) + 20);
        $stmtUpdate = $pdo->prepare("UPDATE user_progress SET scores = ? WHERE user_id = ?");
        $stmtUpdate->execute([json_encode($scores), $userId]);
        $pdo->commit();
    }

    return true;
}

function buildFeedbackSlackBlocks(string $username, string $type, array $cleanAnswers): array {
    $title = 'Lexi Feedback';
    if ($type === 'energy_refill') {
        $title = 'Energy Refill Feedback';
    }

    $blocks = [
        [
            'type' => 'header',
            'text' => [
                'type' => 'plain_text',
                'text' => $title,
                'emoji' => true
            ]
        ],
        [
            'type' => 'section',
            'fields' => [
                ['type' => 'mrkdwn', 'text' => "*User:*\n" . $username],
                ['type' => 'mrkdwn', 'text' => "*Type:*\n" . $type]
            ]
        ]
    ];

    foreach ($cleanAnswers as $question => $answer) {
        $blocks[] = [
            'type' => 'section',
            'text' => ['type' => 'mrkdwn', 'text' => '*' . $question . "*\n> " . $answer]
        ];
    }

    return $blocks;
}

function sendFeedbackToSlack(array $blocks): void {
    $slackWebhookUrl = getFeedbackSlackWebhookUrl();
    if ($slackWebhookUrl === '') {
        return;
    }

    $slackPayload = json_encode(['blocks' => $blocks]);
    $ch = curl_init($slackWebhookUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $slackPayload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($slackPayload)
    ]);
    curl_exec($ch);
}

function logFeedbackSubmission(string $username, string $type, array $cleanAnswers): void {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0750, true);
    }

    file_put_contents($logDir . '/feedback.log', date('Y-m-d H:i:s') . " - User: $username - Type: $type - Payload: " . json_encode($cleanAnswers) . "\n", FILE_APPEND | LOCK_EX);
}

function handleSubmitFeedback(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    if (!security_rate_limit('feedback_' . $_SESSION['user_id'], 10, 3600)) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many feedback submissions. Please try again later.']);
        return;
    }

    $userId = (int)$_SESSION['user_id'];
    $username = security_sanitize_log_line($_SESSION['username'] ?? 'Unknown User', 100);
    $type = security_sanitize_log_line($data['type'] ?? 'general', 50);
    $answers = [];
    if (isset($data['answers']) && is_array($data['answers'])) {
        $answers = $data['answers'];
    }

    if (!in_array($type, ['energy_refill', 'widget', 'general'], true)) {
        $type = 'general';
    }

    $cleanAnswers = sanitizeFeedbackAnswers($answers);

    try {
        if (!applyFeedbackReward($pdo, $userId, $type)) {
            return;
        }

        sendFeedbackToSlack(buildFeedbackSlackBlocks($username, $type, $cleanAnswers));
        logFeedbackSubmission($username, $type, $cleanAnswers);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Feedback submit error: ' . $e->getMessage());
        echo json_encode(['error' => 'Failed to submit feedback.']);
    }
}

// --- Friends API Handlers ---

function handleSendFriendRequest(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $targetQuery = isset($data['target']) ? trim($data['target']) : '';

    if (empty($targetQuery)) {
        echo json_encode(['error' => 'Add meg a felhasználónevet vagy e-mail címet!']);
        return;
    }

    try {
        // Find target user
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$targetQuery, $targetQuery]);
        $targetId = $stmt->fetchColumn();

        if (!$targetId) {
            echo json_encode(['error' => 'Felhasználó nem található.']);
            return;
        }

        if ($targetId == $userId) {
            echo json_encode(['error' => 'Magadat nem veheted fel barátnak!']);
            return;
        }

        // Check existing request
        $stmtCheck = $pdo->prepare("SELECT status FROM user_friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
        $stmtCheck->execute([$userId, $targetId, $targetId, $userId]);
        $existing = $stmtCheck->fetchColumn();

        if ($existing) {
            if ($existing === 'accepted') {
                echo json_encode(['error' => 'Már barátok vagytok!']);
            } else if ($existing === 'pending') {
                echo json_encode(['error' => 'Már van egy függőben lévő kérés!']);
            } else {
                echo json_encode(['error' => 'Nem veheted fel ezt a felhasználót.']);
            }
            return;
        }

        // Insert pending request
        $stmtInsert = $pdo->prepare("INSERT INTO user_friends (user_id, friend_id, status) VALUES (?, ?, 'pending')");
        $stmtInsert->execute([$userId, $targetId]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        error_log('Friend request error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a barátkérelem elküldésekor.']);
    }
}

function handleAcceptFriendRequest(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $friendId = isset($data['friend_id']) ? (int)$data['friend_id'] : 0;

    if (!$friendId) {
        echo json_encode(['error' => 'Invalid friend ID']);
        return;
    }

    try {
        // The request must have been sent TO the current user
        $stmt = $pdo->prepare("UPDATE user_friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ? AND status = 'pending'");
        $stmt->execute([$friendId, $userId]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Nem található függőben lévő kérelem.']);
        }
    } catch (Exception $e) {
        error_log('Accept friend error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a kérelem elfogadásakor.']);
    }
}

function handleRemoveFriend(PDO $pdo, array $data) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_SESSION['user_id'];
    $friendId = isset($data['friend_id']) ? (int)$data['friend_id'] : 0;

    if (!$friendId) {
        echo json_encode(['error' => 'Invalid friend ID']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM user_friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
        $stmt->execute([$userId, $friendId, $friendId, $userId]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        error_log('Remove friend error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a barát törlésekor.']);
    }
}

function handleGetFriends(PDO $pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $userId = $_SESSION['user_id'];

    try {
        // Get accepted friends
        $stmtAccepted = $pdo->prepare("
            SELECT u.id, u.username, u.avatar,
                   IFNULL(up.points, 0) as points,
                   IFNULL(l.name, 'Unranked') as league_name,
                   l.id as league_id
            FROM user_friends uf
            JOIN users u ON (u.id = uf.friend_id AND uf.user_id = ?) OR (u.id = uf.user_id AND uf.friend_id = ?)
            LEFT JOIN user_progress up ON u.id = up.user_id
            LEFT JOIN user_leagues ul ON u.id = ul.user_id
            LEFT JOIN leagues l ON ul.league_id = l.id
            WHERE uf.status = 'accepted'
        ");
        $stmtAccepted->execute([$userId, $userId]);
        $friends = $stmtAccepted->fetchAll();

        // Calculate rank within league for each friend
        foreach ($friends as &$friend) {
            if ($friend['league_id']) {
                $stmtRank = $pdo->prepare("
                    SELECT COUNT(*) + 1 as rank
                    FROM user_leagues ul2
                    JOIN user_progress up2 ON ul2.user_id = up2.user_id
                    WHERE ul2.league_id = ? AND up2.monthly_xp > (
                        SELECT monthly_xp FROM user_progress WHERE user_id = ?
                    )
                ");
                $stmtRank->execute([$friend['league_id'], $friend['id']]);
                $friend['rank'] = $stmtRank->fetchColumn();
            } else {
                $friend['rank'] = null;
            }
        }

        // Get pending requests (received by current user)
        $stmtPending = $pdo->prepare("
            SELECT u.id, u.username, u.avatar
            FROM user_friends uf
            JOIN users u ON u.id = uf.user_id
            WHERE uf.friend_id = ? AND uf.status = 'pending'
        ");
        $stmtPending->execute([$userId]);
        $pending = $stmtPending->fetchAll();

        echo json_encode([
            'success' => true,
            'friends' => $friends,
            'pending' => $pending
        ]);
    } catch (Exception $e) {
        error_log('Get friends error: ' . $e->getMessage());
        echo json_encode(['error' => 'Hiba történt a barátok betöltésekor.']);
    }
}
