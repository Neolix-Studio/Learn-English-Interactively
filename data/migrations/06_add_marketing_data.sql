-- Migration: Add marketing_data JSON column to users table
-- Target Database: MariaDB 11.4 on db.r6.websupport.sk

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS marketing_data JSON NULL;
