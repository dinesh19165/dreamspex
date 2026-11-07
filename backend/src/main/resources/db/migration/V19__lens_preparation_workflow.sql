ALTER TABLE order_items
    ADD COLUMN lens_preparation_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN lens_preparation_days INT NULL,
    ADD COLUMN lens_preparation_notes VARCHAR(1000) NULL,
    ADD COLUMN lens_preparation_updated_by CHAR(36) NULL,
    ADD COLUMN lens_preparation_updated_at DATETIME(6) NULL,
    ADD CONSTRAINT fk_order_items_lens_preparation_user
        FOREIGN KEY (lens_preparation_updated_by) REFERENCES users(id) ON DELETE SET NULL;
