CREATE TABLE customer_profiles (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    first_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(32) NULL,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    membership_status VARCHAR(24) NOT NULL DEFAULT 'NONE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_customer_profiles_user (user_id),
    CONSTRAINT fk_customer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE addresses (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    label VARCHAR(60) NULL,
    recipient_name VARCHAR(160) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    country_code CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_addresses_user_default (user_id, is_default),
    KEY ix_addresses_user_deleted (user_id, deleted_at),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    actor_user_id CHAR(36) NULL,
    action VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NULL,
    resource_id CHAR(36) NULL,
    request_id VARCHAR(100) NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(512) NULL,
    details JSON NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_audit_actor_created (actor_user_id, created_at),
    KEY ix_audit_action_created (action, created_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE otp_challenges
    ADD COLUMN delivery_channel VARCHAR(16) NULL,
    ADD COLUMN resend_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN last_sent_at DATETIME(6) NULL,
    ADD KEY ix_otp_expires_at (expires_at);
