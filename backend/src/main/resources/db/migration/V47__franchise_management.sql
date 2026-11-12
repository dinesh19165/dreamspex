ALTER TABLE stores
    ADD COLUMN franchise_code VARCHAR(40) NULL,
    ADD COLUMN owner_name VARCHAR(160) NULL,
    ADD COLUMN owner_email VARCHAR(255) NULL,
    ADD COLUMN gst_number VARCHAR(32) NULL,
    ADD COLUMN business_type VARCHAR(120) NULL,
    ADD COLUMN franchise_managed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD UNIQUE KEY uk_stores_franchise_code (franchise_code);

CREATE TABLE franchise_users (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    store_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_franchise_user_user (user_id),
    KEY ix_franchise_users_store (store_id),
    CONSTRAINT fk_franchise_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_franchise_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE franchise_product_assignments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    store_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    availability_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_franchise_assignment_product (store_id, product_id),
    CONSTRAINT fk_franchise_assignment_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_franchise_assignment_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE franchise_inventory (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    store_id VARCHAR(255) NOT NULL,
    variant_id VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 0,
    availability_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_franchise_inventory_variant (store_id, variant_id),
    KEY ix_franchise_inventory_store_status (store_id, availability_status),
    CONSTRAINT fk_franchise_inventory_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_franchise_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    CONSTRAINT ck_franchise_inventory_quantities CHECK (
        quantity >= 0 AND reserved_quantity >= 0 AND reserved_quantity <= quantity AND low_stock_threshold >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_movements (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    store_id VARCHAR(255) NOT NULL,
    variant_id VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255) NULL,
    movement_type VARCHAR(32) NOT NULL,
    quantity_change INT NOT NULL,
    reference_id VARCHAR(255) NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_inventory_movements_store_created (store_id, created_at),
    KEY ix_inventory_movements_reference (reference_id),
    CONSTRAINT fk_inventory_movements_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_movements_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE franchise_inventory_reservations (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    inventory_id VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_franchise_reservation_order_inventory (order_id, inventory_id),
    CONSTRAINT fk_franchise_reservation_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_franchise_reservation_inventory FOREIGN KEY (inventory_id) REFERENCES franchise_inventory(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
