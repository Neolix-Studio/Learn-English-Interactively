-- #386 · Purge the seeded bot accounts (E0b)
--
-- What it does: DELETES the ~500 bot accounts (bot1@lexipaws.local ...
-- bot500@lexipaws.local) and, through the ON DELETE CASCADE links that
-- migration 23 added (#385), every row they own: progress, subscription,
-- league, rewards, mistakes, words, items, friendships and character
-- progress. Real accounts are not touched. There is no undo except your export.
--
-- When: any time after the #386 push, and only after
--   (a) a fresh full export (Export -> Quick -> SQL) that ends with COMMIT;
--   (b) 386_check_before_bot_purge.sql showed the numbers it describes.
-- Select the Lexipaws database in the left sidebar first, then run the three
-- statements one at a time: first the DELETE, then the two checks.
--
-- What you should see:
--   1. The DELETE: "about 500 rows affected" - the exact_bots number from the
--      check file. (phpMyAdmin counts only the users rows, not the cascaded ones.)
--   2. One row: bots_left 0, users about 11, user_progress the same number as
--      users.
--   3. One row of zeros: no table still holds a row for a deleted account.

-- 1. Delete the bots
DELETE FROM users WHERE email REGEXP '^bot[0-9]+@lexipaws[.]local$';

-- 2. What is left (one row)
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE 'bot%@lexipaws.local') AS bots_left,
  (SELECT COUNT(*) FROM users)         AS users,
  (SELECT COUNT(*) FROM user_progress) AS user_progress;

-- 3. Rows that name an account that no longer exists (one row, all 0)
SELECT
  (SELECT COUNT(*) FROM user_progress         WHERE user_id NOT IN (SELECT id FROM users)) AS user_progress,
  (SELECT COUNT(*) FROM user_subscriptions    WHERE user_id NOT IN (SELECT id FROM users)) AS user_subscriptions,
  (SELECT COUNT(*) FROM user_leagues          WHERE user_id NOT IN (SELECT id FROM users)) AS user_leagues,
  (SELECT COUNT(*) FROM user_rewards          WHERE user_id NOT IN (SELECT id FROM users)) AS user_rewards,
  (SELECT COUNT(*) FROM user_failed_exercises WHERE user_id NOT IN (SELECT id FROM users)) AS user_failed_exercises,
  (SELECT COUNT(*) FROM user_vocabulary       WHERE user_id NOT IN (SELECT id FROM users)) AS user_vocabulary,
  (SELECT COUNT(*) FROM user_inventory        WHERE user_id NOT IN (SELECT id FROM users)) AS user_inventory,
  (SELECT COUNT(*) FROM user_friends          WHERE user_id NOT IN (SELECT id FROM users)
                                                 OR friend_id NOT IN (SELECT id FROM users)) AS user_friends,
  (SELECT COUNT(*) FROM character_progress    WHERE user_id NOT IN (SELECT id FROM users)) AS character_progress,
  (SELECT COUNT(*) FROM beta_invites          WHERE used_by_user_id NOT IN (SELECT id FROM users)) AS beta_invites;
