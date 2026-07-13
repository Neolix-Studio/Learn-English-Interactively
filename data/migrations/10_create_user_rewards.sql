CREATE TABLE IF NOT EXISTS user_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    league_id INT NOT NULL,
    placement INT NOT NULL,
    bones_reward INT DEFAULT 0,
    shields_reward INT DEFAULT 0,
    title_reward VARCHAR(100) DEFAULT NULL,
    is_claimed TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
