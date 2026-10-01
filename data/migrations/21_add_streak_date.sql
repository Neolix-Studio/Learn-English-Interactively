-- Migration: the day the streak is counted through (B3b, #381)
-- The server counts the streak itself now: one completed lesson per calendar
-- day in Europe/Budapest, one shield per missed day. streak_date is the last
-- day the streak covers, either a lesson day or a missed day a shield paid for.
-- NULL means the row has not been counted by the server yet: its stored streak
-- is kept as it is, and the next lesson adds one day to it.
-- Additive only; running it twice changes nothing.

ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS streak_date DATE NULL;
