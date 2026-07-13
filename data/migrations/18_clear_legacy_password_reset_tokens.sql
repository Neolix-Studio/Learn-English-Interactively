-- Migration: Clear legacy raw password reset tokens
-- Context: reset_token now stores a SHA-256 hash of the emailed token.
-- Existing raw reset links should be invalidated during rollout.

UPDATE users
SET reset_token = NULL,
    reset_expires = NULL
WHERE reset_token IS NOT NULL
   OR reset_expires IS NOT NULL;
