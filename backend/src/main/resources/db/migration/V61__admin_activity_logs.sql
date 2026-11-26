CREATE TABLE admin_activity_logs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    admin_id VARCHAR(255) NULL,
    admin_name VARCHAR(160) NULL,
    admin_email VARCHAR(254) NULL,
    activity_type VARCHAR(40) NOT NULL,
    module_name VARCHAR(80) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(512) NULL,
    details VARCHAR(1000) NULL,
    status VARCHAR(16) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_admin_activity_created (created_at),
    KEY ix_admin_activity_type_status (activity_type, status, created_at),
    KEY ix_admin_activity_module_created (module_name, created_at),
    KEY ix_admin_activity_email_created (admin_email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
