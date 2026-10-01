-- Migration: let deleting a user remove all of their rows (E0a, #385)
-- user_leagues, user_rewards, user_failed_exercises and character_progress
-- were created without a foreign key to users, so DELETE FROM users left their
-- rows behind. This removes the rows that already belong to no user, adds the
-- missing index on user_rewards.user_id, and adds ON DELETE CASCADE foreign
-- keys, so that one DELETE FROM users WHERE id = ? erases a user everywhere.
-- The deletes only touch rows whose user no longer exists. Every statement is
-- guarded, so running the file twice changes nothing.

DELETE ul FROM user_leagues ul LEFT JOIN users u ON u.id = ul.user_id WHERE u.id IS NULL;
DELETE ur FROM user_rewards ur LEFT JOIN users u ON u.id = ur.user_id WHERE u.id IS NULL;
DELETE fe FROM user_failed_exercises fe LEFT JOIN users u ON u.id = fe.user_id WHERE u.id IS NULL;
DELETE cp FROM character_progress cp LEFT JOIN users u ON u.id = cp.user_id WHERE u.id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);

ALTER TABLE user_leagues
ADD CONSTRAINT fk_user_leagues_user FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_rewards
ADD CONSTRAINT fk_user_rewards_user FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_failed_exercises
ADD CONSTRAINT fk_user_failed_exercises_user FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE character_progress
ADD CONSTRAINT fk_character_progress_user FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;
