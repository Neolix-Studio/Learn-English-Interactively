-- Migration: Create beta invite gate
-- Invite codes are stored as SHA-256 hashes, never in plaintext.

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
