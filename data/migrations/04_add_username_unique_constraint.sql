-- Migration: Add Unique Constraint to users.username
-- Target Database: MariaDB

-- NOTE: This migration previously began with
--   DELETE t1 FROM users t1 INNER JOIN users t2 WHERE t1.id < t2.id AND t1.username = t2.username;
-- to clear duplicates before adding the constraint. That statement was removed because
-- users(id) is referenced with ON DELETE CASCADE by user_progress, user_vocabulary,
-- user_inventory and user_friends, so a replay on a database whose migration_history row
-- was missing would silently destroy accounts and all of their progress.
-- If duplicates ever exist, the ALTER below now fails loudly instead. Resolve them by hand.

-- The index name is given explicitly and matches the name MariaDB auto-assigns to
-- `ADD UNIQUE (username)`, so IF NOT EXISTS correctly detects the constraint on databases
-- where the original version of this migration already ran.
ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS username (username);
