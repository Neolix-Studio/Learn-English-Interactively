-- Migration: Add gamification progress state columns to user_progress table
-- Target Database: MariaDB 11.4 on db.r6.websupport.sk

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_shields INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_active_date DATE NULL,
ADD COLUMN IF NOT EXISTS unlocked_items TEXT NULL,
ADD COLUMN IF NOT EXISTS active_theme VARCHAR(50) DEFAULT 'default',
ADD COLUMN IF NOT EXISTS earned_xp_per_node TEXT NULL;
