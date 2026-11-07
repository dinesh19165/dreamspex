CREATE TABLE return_policy (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    return_window_days INT NULL,
    updated_by VARCHAR(255) NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_return_policy_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO return_policy (id, enabled, return_window_days, updated_by, updated_at)
VALUES ('default', FALSE, NULL, NULL, CURRENT_TIMESTAMP(6));

CREATE TABLE return_requests (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    request_number VARCHAR(40) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    resolution VARCHAR(20) NOT NULL,
    reason_code VARCHAR(40) NOT NULL,
    description VARCHAR(2000) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    admin_remarks VARCHAR(2000) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_return_request_number (request_number),
    KEY ix_return_requests_user_created (user_id, created_at),
    KEY ix_return_requests_status_created (status, created_at),
    KEY ix_return_requests_order (order_id),
    CONSTRAINT fk_return_requests_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE return_request_items (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    return_request_id VARCHAR(255) NOT NULL,
    order_item_id VARCHAR(255) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY uk_return_request_order_item (return_request_id, order_item_id),
    KEY ix_return_request_items_order_item (order_item_id),
    CONSTRAINT fk_return_request_items_request FOREIGN KEY (return_request_id) REFERENCES return_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_request_items_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE return_evidence (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    return_request_id VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_return_evidence_storage_key (storage_key),
    KEY ix_return_evidence_request (return_request_id),
    CONSTRAINT fk_return_evidence_request FOREIGN KEY (return_request_id) REFERENCES return_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE return_status_history (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    return_request_id VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    note VARCHAR(2000) NULL,
    changed_by VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_return_status_history_request_created (return_request_id, created_at),
    CONSTRAINT fk_return_status_history_request FOREIGN KEY (return_request_id) REFERENCES return_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_status_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE return_refund_transactions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    return_request_id VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_refund_id VARCHAR(120) NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(40) NOT NULL,
    error_message VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    processed_at DATETIME(6) NULL,
    UNIQUE KEY uk_return_refund_idempotency (idempotency_key),
    UNIQUE KEY uk_return_refund_provider_id (provider, provider_refund_id),
    KEY ix_return_refund_request_created (return_request_id, created_at),
    CONSTRAINT fk_return_refund_request FOREIGN KEY (return_request_id) REFERENCES return_requests(id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE returnable_products (
    product_id VARCHAR(255) NOT NULL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by VARCHAR(255) NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_returnable_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_returnable_products_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
