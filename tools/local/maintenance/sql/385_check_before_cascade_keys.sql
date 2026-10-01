-- #385 · Check before migration 23 (ON DELETE CASCADE foreign keys)
--
-- What it does: READ-ONLY. Changes nothing. Run it in phpMyAdmin on the live
-- database BEFORE saying "go" for #385.
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

-- 1. Rows migration 23 would delete
SELECT 'user_leagues' AS tbl, COUNT(*) AS orphan_rows FROM user_leagues ul LEFT JOIN users u ON u.id = ul.user_id WHERE u.id IS NULL
UNION ALL
SELECT 'user_rewards', COUNT(*) FROM user_rewards ur LEFT JOIN users u ON u.id = ur.user_id WHERE u.id IS NULL
UNION ALL
SELECT 'user_failed_exercises', COUNT(*) FROM user_failed_exercises fe LEFT JOIN users u ON u.id = fe.user_id WHERE u.id IS NULL
UNION ALL
SELECT 'character_progress', COUNT(*) FROM character_progress cp LEFT JOIN users u ON u.id = cp.user_id WHERE u.id IS NULL;

-- 2. Table types
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users', 'user_leagues', 'user_rewards', 'user_failed_exercises', 'character_progress');

-- 3. Column types that must match
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'users' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME IN ('user_leagues', 'user_rewards', 'user_failed_exercises', 'character_progress') AND COLUMN_NAME = 'user_id'));
