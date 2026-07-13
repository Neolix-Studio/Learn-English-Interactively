-- Migration: Create User Vocabulary Table
-- Compatible with MariaDB 11.4

CREATE TABLE IF NOT EXISTS user_vocabulary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    word VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    strength INT DEFAULT 1,
    last_reviewed TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY user_word_idx (user_id, word),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
