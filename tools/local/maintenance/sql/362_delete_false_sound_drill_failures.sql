-- #362 (UX0a-3): delete the false "same or different?" failures from the Mistakes list
--
-- THIS ONE CHANGES DATA. It deletes rows from one table, user_failed_exercises
-- (the list behind "Hibák gyakorlása"). It touches no other table and no account.
--
-- Why
--   A. Until #361 went live (2026-09-30 10:39 UTC) the "same or different?" sound
--      drill undid every correct tap, so every answer was graded wrong and saved
--      as a mistake. Nobody could get one right. Every such row from before that
--      moment is false, whatever the learner really tapped.
--   B. 12 sound items showed the same word twice (bow/bow, sow/sow, row/row,
--      mouth/mouth) and could not be answered by ear. #362 replaced them in the
--      lessons, but a saved mistake keeps its own copy of the old item and would
--      keep coming back in practice.
--
-- When to run it
--   After the #362 deploy is green. Run the four statements one by one in the
--   database tool (phpMyAdmin > SQL). It is safe to run twice: the second time
--   finds nothing. Real mistakes made after 2026-09-30 10:39 UTC are kept.
--   If you want a way back, export the table user_failed_exercises first
--   (phpMyAdmin > user_failed_exercises > Export > Go).
--
-- What you should see
--   1. One row of numbers: how many rows statements 2 and 3 will delete, and how
--      many learners they belong to. 0 everywhere means nobody ever failed one
--      of these items; statements 2 and 3 then delete nothing.
--   2. "N rows deleted", N = a_compare_before_fix from statement 1.
--   3. "N rows deleted", N = the b_same_word_twice rows that statement 2 had not
--      already deleted (it can be less than the number in statement 1).
--   4. 0, 0, 0.
--
-- If statement 1 shows a number that surprises you, stop there and tell Claude.

-- 1. Look first: what would be deleted (changes nothing)
SELECT
    COALESCE(SUM(JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND UNIX_TIMESTAMP(last_failed_at) < 1790764740), 0) AS a_compare_before_fix,
    COALESCE(SUM((JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.isSame')) = 'false'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word1')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word2')))
        OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_listen_choose'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[0].text')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[1].text')))), 0) AS b_same_word_twice,
    COUNT(DISTINCT user_id) AS learners
FROM user_failed_exercises
WHERE (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND UNIX_TIMESTAMP(last_failed_at) < 1790764740)
   OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.isSame')) = 'false'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word1')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word2')))
   OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_listen_choose'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[0].text')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[1].text')));

-- 2. A: every "same or different?" mistake saved before #361 went live
--    (1790764740 is 2026-09-30 10:39:00 UTC, written as a number so the
--    database's time zone does not matter)
DELETE FROM user_failed_exercises
WHERE JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
  AND UNIX_TIMESTAMP(last_failed_at) < 1790764740;

-- 3. B: saved copies of the items that showed the same word twice
DELETE FROM user_failed_exercises
WHERE (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.isSame')) = 'false'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word1')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word2')))
   OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_listen_choose'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[0].text')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[1].text')));

-- 4. Look again: all three must be 0 (changes nothing)
SELECT
    COALESCE(SUM(JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND UNIX_TIMESTAMP(last_failed_at) < 1790764740), 0) AS a_compare_before_fix,
    COALESCE(SUM((JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.isSame')) = 'false'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word1')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word2')))
        OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_listen_choose'
            AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[0].text')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[1].text')))), 0) AS b_same_word_twice,
    COUNT(*) AS rows_left_to_delete
FROM user_failed_exercises
WHERE (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND UNIX_TIMESTAMP(last_failed_at) < 1790764740)
   OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_compare'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.isSame')) = 'false'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word1')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.word2')))
   OR (JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.type')) = 'phonics_listen_choose'
        AND JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[0].text')) = JSON_UNQUOTE(JSON_EXTRACT(question_data, '$.options[1].text')));
