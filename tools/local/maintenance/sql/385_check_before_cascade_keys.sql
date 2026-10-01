-- #385 · Check before migration 23 (ON DELETE CASCADE foreign keys)
--
-- What it does: READ-ONLY. Changes nothing. Run it in phpMyAdmin on the live
-- database BEFORE saying "go" for #385. Select the Lexipaws database in the
-- left sidebar first (not information_schema), and run the three queries one
-- at a time. Owner ran it on 2026-10-01: 0 / 0 / 0 / 0, all InnoDB, all int(11).
--
-- When: before the push. Paste the three results into the chat.
--
-- What you should see:
--   1. orphan_rows: how many rows migration 23 would delete in each table
--      (rows whose user no longer exists). Small numbers or 0 are expected.
--   2. engine: every table says InnoDB. A MyISAM table cannot hold the new links.
--   3. column_type: every user_id has exactly the same type as users.id
--      (for example all "int(11)"; "int(10) unsigned" on one side and
--      "int(11)" on the other would make the migration fail).

-- 1. Rows migration 23 would delete (one row of four numbers)
SELECT
  (SELECT COUNT(*) FROM user_leagues          WHERE user_id NOT IN (SELECT id FROM users)) AS user_leagues,
  (SELECT COUNT(*) FROM user_rewards          WHERE user_id NOT IN (SELECT id FROM users)) AS user_rewards,
  (SELECT COUNT(*) FROM user_failed_exercises WHERE user_id NOT IN (SELECT id FROM users)) AS user_failed_exercises,
  (SELECT COUNT(*) FROM character_progress    WHERE user_id NOT IN (SELECT id FROM users)) AS character_progress;

-- 2. Table types
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users','user_leagues','user_rewards','user_failed_exercises','character_progress');

-- 3. Column types that must match
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'users' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME IN ('user_leagues','user_rewards','user_failed_exercises','character_progress') AND COLUMN_NAME = 'user_id'));
