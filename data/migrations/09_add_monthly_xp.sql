ALTER TABLE user_leagues 
ADD COLUMN IF NOT EXISTS monthly_xp INT DEFAULT 0 AFTER weekly_xp;
