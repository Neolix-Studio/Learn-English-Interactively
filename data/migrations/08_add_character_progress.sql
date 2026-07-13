CREATE TABLE IF NOT EXISTS character_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    character_ipa VARCHAR(10) NOT NULL,
    progress_level INT DEFAULT 0 CHECK (progress_level >= 0 AND progress_level <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, character_ipa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_character_progress_user_id ON character_progress(user_id);
