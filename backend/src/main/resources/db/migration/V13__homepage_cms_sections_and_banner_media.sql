ALTER TABLE banners
    ADD COLUMN mobile_image_url VARCHAR(1000) NULL,
    ADD COLUMN desktop_storage_key VARCHAR(500) NULL,
    ADD COLUMN mobile_storage_key VARCHAR(500) NULL,
    ADD COLUMN subtitle VARCHAR(500) NULL,
    ADD COLUMN description TEXT NULL,
    ADD COLUMN button_text VARCHAR(120) NULL,
    ADD COLUMN secondary_button_text VARCHAR(120) NULL,
    ADD COLUMN positioning VARCHAR(80) NULL,
    ADD COLUMN secondary_link_url VARCHAR(1000) NULL;
CREATE TABLE homepage_sections (
    id CHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(120) NOT NULL UNIQUE,
    section_type VARCHAR(40) NOT NULL, title VARCHAR(180) NULL, subtitle VARCHAR(500) NULL,
    content_json JSON NULL, display_order INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT', enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by CHAR(36) NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_homepage_section_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    KEY ix_homepage_sections_public (status, enabled, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE homepage_section_products (
    section_id CHAR(36) NOT NULL, product_id CHAR(36) NOT NULL,
    PRIMARY KEY (section_id, product_id),
    CONSTRAINT fk_homepage_section_products_section FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_homepage_section_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE homepage_section_categories (
    section_id CHAR(36) NOT NULL, category_id CHAR(36) NOT NULL,
    PRIMARY KEY (section_id, category_id),
    CONSTRAINT fk_homepage_section_categories_section FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_homepage_section_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
