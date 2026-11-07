-- V13 created homepage CMS UUID columns as CHAR(36), but the Java UUID values
-- are String identifiers and the rest of the schema was aligned to VARCHAR(255)
-- in V7. Convert the related keys without changing values or relationships.

ALTER TABLE homepage_section_products
    DROP FOREIGN KEY fk_homepage_section_products_section,
    DROP FOREIGN KEY fk_homepage_section_products_product;

ALTER TABLE homepage_section_categories
    DROP FOREIGN KEY fk_homepage_section_categories_section,
    DROP FOREIGN KEY fk_homepage_section_categories_category;

ALTER TABLE homepage_sections
    MODIFY id VARCHAR(255) NOT NULL;

ALTER TABLE homepage_section_products
    MODIFY section_id VARCHAR(255) NOT NULL,
    MODIFY product_id VARCHAR(255) NOT NULL;

ALTER TABLE homepage_section_categories
    MODIFY section_id VARCHAR(255) NOT NULL,
    MODIFY category_id VARCHAR(255) NOT NULL;

ALTER TABLE homepage_section_products
    ADD CONSTRAINT fk_homepage_section_products_section
        FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_homepage_section_products_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE homepage_section_categories
    ADD CONSTRAINT fk_homepage_section_categories_section
        FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_homepage_section_categories_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
