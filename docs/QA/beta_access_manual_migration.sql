-- Lexipaws beta access manual migration
-- Target: Websupport.sk MariaDB 11.4
-- Safe to run manually before deployment. The automated migration can still run later.

CREATE TABLE IF NOT EXISTS beta_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NULL,
    invite_code_hash CHAR(64) NOT NULL UNIQUE,
    status ENUM('active', 'used', 'revoked') NOT NULL DEFAULT 'active',
    invited_by VARCHAR(100) NULL,
    used_by_user_id INT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_beta_invites_email (email),
    INDEX idx_beta_invites_status (status),
    CONSTRAINT fk_beta_invites_used_by_user
        FOREIGN KEY (used_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS beta_access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NULL,
    base_language VARCHAR(10) NOT NULL DEFAULT 'hu',
    message TEXT NULL,
    status ENUM('pending', 'invited', 'rejected') NOT NULL DEFAULT 'pending',
    source_path VARCHAR(255) NULL,
    user_agent VARCHAR(255) NULL,
    ip_hash CHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_beta_access_requests_status (status),
    INDEX idx_beta_access_requests_created_at (created_at)
);
