CREATE TABLE maintenance_settings (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_type VARCHAR(40) NOT NULL,
    target_scope VARCHAR(20) NOT NULL,
    title VARCHAR(200) NULL,
    message TEXT NULL,
    start_at DATETIME(6) NULL,
    end_at DATETIME(6) NULL,
    admin_bypass BOOLEAN NOT NULL DEFAULT TRUE,
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_maintenance_settings_config_key (config_key),
    KEY ix_maintenance_settings_active_schedule (is_active, start_at, end_at),
    CONSTRAINT fk_maintenance_settings_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_maintenance_settings_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_maintenance_settings_type CHECK (
        maintenance_type IN ('FULL_SYSTEM', 'PAYMENT', 'AUTH', 'CATALOG', 'API')
    ),
    CONSTRAINT ck_maintenance_settings_scope CHECK (
        target_scope IN ('ALL', 'WEB', 'APP', 'API')
    ),
    CONSTRAINT ck_maintenance_settings_schedule CHECK (
        start_at IS NULL OR end_at IS NULL OR end_at > start_at
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE maintenance_audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    maintenance_id BIGINT NULL,
    action VARCHAR(30) NOT NULL,
    previous_values JSON NULL,
    new_values JSON NULL,
    performed_by CHAR(36) NULL,
    performed_at DATETIME(6) NOT NULL,
    remarks VARCHAR(500) NULL,
    KEY ix_maintenance_audit_logs_maintenance (maintenance_id, performed_at),
    KEY ix_maintenance_audit_logs_performed (performed_by, performed_at),
    CONSTRAINT fk_maintenance_audit_logs_maintenance
        FOREIGN KEY (maintenance_id) REFERENCES maintenance_settings(id) ON DELETE SET NULL,
    CONSTRAINT fk_maintenance_audit_logs_performed_by
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO maintenance_settings (
    config_key,
    is_active,
    maintenance_type,
    target_scope,
    title,
    message,
    start_at,
    end_at,
    admin_bypass,
    created_by,
    updated_by,
    created_at,
    updated_at
) VALUES (
    'GLOBAL',
    FALSE,
    'FULL_SYSTEM',
    'ALL',
    'DreamSpex Maintenance',
    'We are currently performing maintenance. Please try again later.',
    NULL,
    NULL,
    TRUE,
    NULL,
    NULL,
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6)
);
