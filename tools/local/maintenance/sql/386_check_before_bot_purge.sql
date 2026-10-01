-- #386 · Check before purging the seeded bot accounts (E0b)
--
-- What it does: READ-ONLY. Changes nothing. Run it in phpMyAdmin on the live
-- database BEFORE 386_purge_bot_accounts.sql. Select the Lexipaws database in
-- the left sidebar first (not information_schema), and run the two queries
-- one at a time.
--
-- When: after taking a fresh full export (Export -> Quick -> SQL) and checking
-- that it ends with COMMIT;. Then run this, then the purge file.
--
-- A bot is an account whose e-mail is exactly "bot", then digits, then
-- "@lexipaws.local" (bot1@lexipaws.local ... bot500@lexipaws.local). The purge
-- deletes exactly the accounts that query 1 counts as exact_bots.
--
-- What you should see:
--   1. One row. exact_bots is about 500, and like_bots and lexipaws_local are
--      the same number as exact_bots (nothing else looks like a bot; if they
--      differ, stop and paste this row into the issue). first_bot is 1 and
--      last_bot is about 500. real_users is about 11. bots_with_avatar is 0
--      (a bot with an uploaded picture would leave a file behind in avatars/).
--   2. The accounts that will STAY, about 11 rows: your own and your testers'.
--      If one of them is not a real person, or a real person is missing, stop
--      and say so before running the purge.

-- 1. How many accounts the purge would delete (one row)
SELECT
  (SELECT COUNT(*) FROM users WHERE email REGEXP '^bot[0-9]+@lexipaws[.]local$') AS exact_bots,
  (SELECT COUNT(*) FROM users WHERE email LIKE 'bot%@lexipaws.local')           AS like_bots,
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@lexipaws.local')              AS lexipaws_local,
  (SELECT MIN(CAST(SUBSTRING_INDEX(SUBSTRING(email, 4), '@', 1) AS UNSIGNED)) FROM users WHERE email REGEXP '^bot[0-9]+@lexipaws[.]local$') AS first_bot,
  (SELECT MAX(CAST(SUBSTRING_INDEX(SUBSTRING(email, 4), '@', 1) AS UNSIGNED)) FROM users WHERE email REGEXP '^bot[0-9]+@lexipaws[.]local$') AS last_bot,
  (SELECT COUNT(*) FROM users WHERE email REGEXP '^bot[0-9]+@lexipaws[.]local$' AND avatar IS NOT NULL AND avatar <> '') AS bots_with_avatar,
  (SELECT COUNT(*) FROM users WHERE email NOT REGEXP '^bot[0-9]+@lexipaws[.]local$') AS real_users;

-- 2. The accounts that stay
SELECT id, username, email, created_at FROM users
WHERE email NOT REGEXP '^bot[0-9]+@lexipaws[.]local$'
ORDER BY id;
