ALTER TABLE orders
    ADD COLUMN delivery_distance_km DECIMAL(8,2) NULL,
    ADD COLUMN delivery_fee_amount DECIMAL(12,2) NULL,
    ADD COLUMN delivery_fee_policy_id CHAR(36) NULL,
    ADD COLUMN delivery_fee_slab_id CHAR(36) NULL,
    ADD COLUMN delivery_fee_rule_name VARCHAR(120) NULL,
    ADD COLUMN delivery_fee_rule_scope VARCHAR(20) NULL;

CREATE TABLE delivery_fee_policies (
    id CHAR(36) NOT NULL,
    name VARCHAR(120) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    store_id CHAR(36) NULL,
    free_delivery_threshold DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    max_delivery_distance_km DECIMAL(8,2) NOT NULL DEFAULT 50.00,
    unavailable_areas TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_delivery_fee_policy_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_fee_slabs (
    id CHAR(36) NOT NULL,
    policy_id CHAR(36) NOT NULL,
    label VARCHAR(120) NOT NULL,
    min_distance_km DECIMAL(8,2) NOT NULL,
    max_distance_km DECIMAL(8,2) NULL,
    fee_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_delivery_fee_slab_policy FOREIGN KEY (policy_id) REFERENCES delivery_fee_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_delivery_fee_policy_scope_store ON delivery_fee_policies (scope, store_id, status);
CREATE INDEX idx_delivery_fee_slab_policy_status ON delivery_fee_slabs (policy_id, status, min_distance_km);
