CREATE TABLE homepage_cards (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    section_key VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    subtitle VARCHAR(500) NULL,
    description TEXT NULL,
    image_url VARCHAR(1000) NULL,
    image_storage_key VARCHAR(500) NULL,
    button_text VARCHAR(120) NULL,
    destination_type VARCHAR(16) NOT NULL,
    destination_value VARCHAR(500) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    product_id VARCHAR(255) NULL,
    category_id VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_homepage_cards_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_homepage_cards_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_homepage_cards_user
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY ix_homepage_cards_public (section_key, status, enabled, display_order),
    KEY ix_homepage_cards_product (product_id),
    KEY ix_homepage_cards_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
