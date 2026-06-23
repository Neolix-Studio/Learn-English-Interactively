-- Migration: Add Daily Quests columns to user_progress table
-- Target Database: MariaDB on db.r6.websupport.sk

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS daily_quests_date DATE NULL,
ADD COLUMN IF NOT EXISTS active_quests TEXT NULL,
ADD COLUMN IF NOT EXISTS quest_progress TEXT NULL,
ADD COLUMN IF NOT EXISTS completed_quests_today TEXT NULL;
