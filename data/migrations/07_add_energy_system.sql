-- Migration 07: Add Energy System
ALTER TABLE user_progress
ADD COLUMN energy INT DEFAULT 5,
ADD COLUMN last_energy_refill DATETIME DEFAULT CURRENT_TIMESTAMP;
