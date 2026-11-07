CREATE TABLE prescriptions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    patient_name VARCHAR(160) NOT NULL,
    prescription_date DATE NULL,
    right_sph DECIMAL(6,2) NULL,
    right_cyl DECIMAL(6,2) NULL,
    right_axis SMALLINT NULL,
    right_add DECIMAL(6,2) NULL,
    left_sph DECIMAL(6,2) NULL,
    left_cyl DECIMAL(6,2) NULL,
    left_axis SMALLINT NULL,
    left_add DECIMAL(6,2) NULL,
    pd DECIMAL(6,2) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW',
    review_note VARCHAR(1000) NULL,
    reviewed_by CHAR(36) NULL,
    reviewed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_prescriptions_user_status (user_id, status),
    KEY ix_prescriptions_status_created (status, created_at),
    CONSTRAINT fk_prescriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_prescriptions_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_files (
    id CHAR(36) NOT NULL PRIMARY KEY,
    prescription_id CHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_prescription_files_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    KEY ix_prescription_files_prescription (prescription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE membership_plans (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    duration_days INT UNSIGNED NOT NULL,
    perks JSON NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_membership_plans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memberships (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    starts_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_memberships_user_status (user_id, status),
    KEY ix_memberships_expiry (status, expires_at),
    CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_memberships_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_notifications_user_created (user_id, created_at),
    KEY ix_notifications_user_read (user_id, read_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
