CREATE TABLE IF NOT EXISTS leagues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    min_xp INT NOT NULL,
    icon_svg TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO leagues (id, name, min_xp) VALUES 
(1, 'Bronze', 0),
(2, 'Silver', 500),
(3, 'Gold', 1500),
(4, 'Diamond', 5000);

CREATE TABLE IF NOT EXISTS user_leagues (
    user_id INT PRIMARY KEY,
    league_id INT NOT NULL,
    weekly_xp INT DEFAULT 0,
    last_week_rank INT DEFAULT 0,
    FOREIGN KEY (league_id) REFERENCES leagues(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
