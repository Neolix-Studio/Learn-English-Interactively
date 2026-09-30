-- #358 (B1-cron): what the old nightly cron did to streaks and shields
--
-- READ-ONLY. Three SELECTs. Nothing here changes any data.
-- OPTIONAL. The #358 fix does not need it; it only tells you what already happened.
--
-- Why you might want it
--   Until #358, cron_notifications.php ran every night at 02:00 from the dev
--   folder, on the database that dev shares with production. For every row
--   with a streak and a last_active_date older than yesterday it took one
--   shield per night, sent a "streak protected" e-mail, and when no shield
--   was left it set the streak to 0. The old app wrote exactly such rows for
--   its users, and that cron has been in the dev folder since 2026-07-13.
--   The code says this happened. Only the database can say to how many
--   accounts, and until when.
--
-- When to run it
--   Any time, before or after the #358 deploy. Run the three statements one
--   by one in the database tool (phpMyAdmin > SQL).
--
-- What you should see
--   1. accounts_mailed = 0  -> no "streak protected" e-mail was ever recorded;
--                              most likely no shield was ever taken.
--      accounts_mailed > 0  -> shields were taken from that many accounts.
--                              first_mail and last_mail say when it started
--                              and when it last happened.
--   2. One row of totals as they are today. Run the same statement on the
--      backup of 2026-08-28 to see how many streaks and shields went missing
--      since then.
--   3. No rows is the good answer. A row here still has its streak and was in
--      the middle of losing shields when #358 shipped. From #358 on the cron
--      no longer touches it: it stays exactly as listed.
--
-- If 1 or 3 show something, tell Claude in the next session. Putting values
-- back from the backup is a separate decision and a separate issue.

-- 1. How many accounts got a "streak protected" e-mail, and when
SELECT COUNT(*) AS accounts_mailed,
       MIN(last_streak_email_sent) AS first_mail,
       MAX(last_streak_email_sent) AS last_mail
FROM users
WHERE last_streak_email_sent IS NOT NULL;

-- 2. Streaks, shields and activity dates as they are today
SELECT COUNT(*) AS progress_rows,
       SUM(streak_count > 0) AS rows_with_a_streak,
       SUM(streak_shields > 0) AS rows_with_a_shield,
       SUM(last_active_date IS NOT NULL) AS rows_with_a_date,
       MIN(last_active_date) AS oldest_date,
       MAX(last_active_date) AS newest_date
FROM user_progress;

-- 3. Rows that still have a streak and a date from the two weeks before #358
SELECT user_id, streak_count, streak_shields, last_active_date
FROM user_progress
WHERE streak_count > 0
  AND last_active_date BETWEEN '2026-09-16' AND '2026-09-30'
ORDER BY last_active_date DESC;
