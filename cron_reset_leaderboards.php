<?php
// cron_reset_leaderboards.php
// Websupport cron can call this with type=weekly/monthly and CRON_SECRET.

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/security.php';

security_require_cli_or_token('CRON_SECRET');

if (!isset($_GET['type']) || !in_array($_GET['type'], ['weekly', 'monthly'])) {
    http_response_code(400);
    die("Invalid type. Must be 'weekly' or 'monthly'.");
}

$type = $_GET['type'];

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    function distributeRewards($pdo, $type) {
        $limit = $type === 'weekly' ? 10 : 40;
        $xp_column = $type === 'weekly' ? 'weekly_xp' : 'monthly_xp';
        $leagues = [1, 2, 3, 4];
        $multipliers = [1 => 1.0, 2 => 1.5, 3 => 2.0, 4 => 3.0];
        
        foreach ($leagues as $league_id) {
            $stmt = $pdo->prepare("SELECT user_id, $xp_column FROM user_leagues WHERE league_id = ? AND $xp_column > 0 ORDER BY $xp_column DESC LIMIT " . (int)$limit);
            $stmt->execute([$league_id]);
            $topPlayers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $rank = 1;
            foreach ($topPlayers as $player) {
                $user_id = $player['user_id'];
                $multiplier = $multipliers[$league_id];
                $bones = 0; $shields = 0; $title = null;

                if ($type === 'weekly') {
                    if ($rank == 1) { $bones = 50; $shields = 1; $title = 'Heti Bajnok'; }
                    else if ($rank == 2) { $bones = 30; $shields = 1; }
                    else if ($rank == 3) { $bones = 15; $shields = 1; }
                    else { $bones = 5; }
                } else {
                    if ($rank == 1) { $bones = 250; $shields = 3; $title = 'Havi Legenda'; }
                    else if ($rank == 2) { $bones = 150; $shields = 2; }
                    else if ($rank == 3) { $bones = 75; $shields = 1; }
                    else { $bones = 25; }
                }

                $bones = round($bones * $multiplier);

                if ($bones > 0 || $shields > 0 || $title) {
                    $insert = $pdo->prepare("INSERT INTO user_rewards (user_id, reward_type, league_id, placement, bones_reward, shields_reward, title_reward) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $insert->execute([$user_id, $type . '_leaderboard', $league_id, $rank, $bones, $shields, $title]);
                }
                $rank++;
            }
        }
    }

    if ($type === 'weekly') {
        distributeRewards($pdo, 'weekly');

        // SEND WEEKLY PROGRESS REPORTS
        require_once __DIR__ . '/mailer.php';
        $leagueNames = [1 => 'Bronz', 2 => 'Ezüst', 3 => 'Arany', 4 => 'Gyémánt'];
        
        $stmtReport = $pdo->prepare("
            SELECT u.id, u.email, u.username, u.notification_preferences, 
                   ul.weekly_xp, ul.league_id, up.streak_count,
                   (SELECT row_num FROM (SELECT user_id, ROW_NUMBER() OVER(PARTITION BY league_id ORDER BY weekly_xp DESC) as row_num FROM user_leagues) as ranked WHERE ranked.user_id = u.id) as current_rank
            FROM users u
            JOIN user_leagues ul ON u.id = ul.user_id
            JOIN user_progress up ON u.id = up.user_id
            WHERE ul.weekly_xp > 0
        ");
        $stmtReport->execute();
        $reportUsers = $stmtReport->fetchAll(PDO::FETCH_ASSOC);

        foreach ($reportUsers as $user) {
            $prefs = json_decode($user['notification_preferences'] ?? '{}', true);
            if (isset($prefs['weekly_report']) && $prefs['weekly_report'] === false) {
                continue;
            }

            $leagueName = $leagueNames[$user['league_id']] ?? 'Bronz';
            sendTemplateEmail($user['email'], 'weekly_report', [
                'username' => $user['username'],
                'weeklyXp' => (int)$user['weekly_xp'],
                'streak' => (int)$user['streak_count'],
                'leagueName' => $leagueName,
                'rank' => (int)$user['current_rank']
            ]);
        }

        // Heti XP nullázása
        // Opcionálisan: Előző heti rang mentése mielőtt nullázzuk
        $stmt = $pdo->prepare("UPDATE user_leagues SET last_week_rank = (SELECT row_num FROM (SELECT user_id, ROW_NUMBER() OVER(PARTITION BY league_id ORDER BY weekly_xp DESC) as row_num FROM user_leagues) as ranked WHERE ranked.user_id = user_leagues.user_id)");
        $stmt->execute();

        $stmt = $pdo->prepare("UPDATE user_leagues SET weekly_xp = 0");
        $stmt->execute();
        echo "Weekly XP reset successfully and rewards distributed.";
    } else if ($type === 'monthly') {
        distributeRewards($pdo, 'monthly');

        // Havi XP nullázása
        $stmt = $pdo->prepare("UPDATE user_leagues SET monthly_xp = 0");
        $stmt->execute();
        echo "Monthly XP reset successfully and rewards distributed.";
    }

} catch (PDOException $e) {
    error_log("Cron error: " . $e->getMessage());
    http_response_code(500);
    die("Database error occurred.");
}
?>
