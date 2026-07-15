-- Migration: Add uploaded avatar filename to users
-- Target Database: MariaDB on db.r6.websupport.sk

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) NULL;
