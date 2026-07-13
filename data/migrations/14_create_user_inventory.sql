CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- e.g., 'theme', 'title', 'border'
    item_id VARCHAR(100) NOT NULL, -- e.g., 'halloween', 'fall'
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY user_item (user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
