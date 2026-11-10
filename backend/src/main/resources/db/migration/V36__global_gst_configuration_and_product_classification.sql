CREATE TABLE gst_configurations (
    id CHAR(36) NOT NULL PRIMARY KEY,
    default_rate DECIMAL(5,2) NOT NULL,
    price_treatment VARCHAR(16) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    active_guard TINYINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    updated_by CHAR(36) NULL,
    UNIQUE KEY uk_gst_configurations_active (active_guard),
    KEY ix_gst_configurations_history (updated_at),
    CONSTRAINT fk_gst_configurations_updated_by FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_gst_configurations_rate CHECK (default_rate >= 0 AND default_rate <= 100),
    CONSTRAINT ck_gst_configurations_treatment CHECK (price_treatment IN ('INCLUSIVE', 'EXCLUSIVE')),
    CONSTRAINT ck_gst_configurations_active_guard CHECK (
        (is_active = TRUE AND active_guard = 1) OR (is_active = FALSE AND active_guard IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO gst_configurations
    (id, default_rate, price_treatment, enabled, is_active, active_guard, created_at, updated_at, updated_by)
VALUES
    ('00000000-0000-4000-8000-000000000036', 18.00, 'INCLUSIVE', TRUE, TRUE, 1, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), NULL);

ALTER TABLE products
    ADD COLUMN hsn_code VARCHAR(16) NULL,
    ADD COLUMN gst_rate DECIMAL(5,2) NULL,
    ADD COLUMN gst_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD CONSTRAINT ck_products_gst_rate CHECK (gst_rate IS NULL OR (gst_rate >= 0 AND gst_rate <= 100));
