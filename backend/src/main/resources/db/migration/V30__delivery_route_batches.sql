CREATE TABLE delivery_batches (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    route_name VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    created_by VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_delivery_batches_status_created (status, created_at),
    KEY ix_delivery_batches_created_by (created_by),
    CONSTRAINT fk_delivery_batches_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_batch_orders (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    active_order_id VARCHAR(255) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    delivery_otp_hash VARCHAR(64) NOT NULL,
    otp_attempts INT NOT NULL DEFAULT 0,
    otp_expires_at DATETIME(6) NOT NULL,
    otp_consumed_at DATETIME(6) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_delivery_batch_order (batch_id, order_id),
    UNIQUE KEY uk_delivery_active_order (active_order_id),
    KEY ix_delivery_batch_orders_batch_status (batch_id, status),
    KEY ix_delivery_batch_orders_order (order_id),
    CONSTRAINT fk_delivery_batch_orders_batch FOREIGN KEY (batch_id)
        REFERENCES delivery_batches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_batch_orders_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_batch_orders_active_order FOREIGN KEY (active_order_id)
        REFERENCES orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_batch_links (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_delivery_batch_link_token_hash (token_hash),
    KEY ix_delivery_batch_links_batch_active (batch_id, revoked_at, expires_at),
    KEY ix_delivery_batch_links_created_by (created_by),
    CONSTRAINT fk_delivery_batch_links_batch FOREIGN KEY (batch_id)
        REFERENCES delivery_batches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_batch_links_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_batch_order_history (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    batch_order_id VARCHAR(255) NOT NULL,
    previous_status VARCHAR(24) NULL,
    new_status VARCHAR(24) NOT NULL,
    note VARCHAR(500) NULL,
    source VARCHAR(24) NOT NULL,
    changed_by VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_delivery_batch_order_history_order_created (batch_order_id, created_at),
    CONSTRAINT fk_delivery_batch_order_history_order FOREIGN KEY (batch_order_id)
        REFERENCES delivery_batch_orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_delivery_batch_order_history_user FOREIGN KEY (changed_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
