SET @drop_lens_preparation_user_fk = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'order_items'
              AND COLUMN_NAME = 'lens_preparation_updated_by'
              AND CONSTRAINT_NAME = 'fk_order_items_lens_preparation_user'
              AND REFERENCED_TABLE_NAME = 'users'
        ),
        'ALTER TABLE order_items DROP FOREIGN KEY `fk_order_items_lens_preparation_user`',
        'SELECT 1'
    )
);
PREPARE drop_lens_preparation_user_fk FROM @drop_lens_preparation_user_fk;
EXECUTE drop_lens_preparation_user_fk;
DEALLOCATE PREPARE drop_lens_preparation_user_fk;

ALTER TABLE order_items
    MODIFY lens_preparation_updated_by VARCHAR(255) NULL;

ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_lens_preparation_user
        FOREIGN KEY (lens_preparation_updated_by) REFERENCES users(id) ON DELETE SET NULL;
