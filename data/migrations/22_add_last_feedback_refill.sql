-- Migration: when the user last got energy for feedback (B3e, #382)
-- The energy-refill-for-feedback survey grants a full refill at most once an
-- hour. The code used to keep that time in a user_metadata table that no
-- migration ever created (the live database has no such table, checked by the
-- owner on 2026-10-01), so the refill always failed. The time now lives on
-- user_progress. NULL means the user has never been refilled for feedback.
-- Additive only; running it twice changes nothing.

ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS last_feedback_refill DATETIME NULL;
