-- Migration: Create user_failed_exercises table
-- This table tracks the mistakes users make during lessons so they can practice them later.

CREATE TABLE IF NOT EXISTS user_failed_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level VARCHAR(10) NOT NULL,
    exercise_id VARCHAR(100) NOT NULL,
    question_data JSON NOT NULL,
    fail_count INT DEFAULT 1,
    last_failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY user_exercise_idx (user_id, level, exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
