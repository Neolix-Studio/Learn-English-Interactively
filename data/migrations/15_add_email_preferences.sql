-- Migration: Add email notification tracking columns to users table
-- Target Database: MariaDB on db.r6.websupport.sk

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSON NULL,
ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS inactivity_email_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_inactivity_email_sent DATETIME NULL,
ADD COLUMN IF NOT EXISTS last_streak_email_sent DATETIME NULL;
