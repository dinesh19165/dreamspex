ALTER TABLE orders
    DROP FOREIGN KEY fk_orders_address;

ALTER TABLE orders
    MODIFY COLUMN address_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    MODIFY COLUMN address_snapshot JSON NULL,
    ADD COLUMN fulfillment_type VARCHAR(16) NOT NULL DEFAULT 'DELIVERY',
    ADD COLUMN reservation_expires_at DATETIME(6) NULL,
    ADD CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE RESTRICT;

UPDATE orders
SET reservation_expires_at = DATE_ADD(created_at, INTERVAL 30 MINUTE)
WHERE status = 'PENDING_PAYMENT'
  AND payment_status = 'PENDING'
  AND reservation_expires_at IS NULL;

INSERT INTO franchise_inventory (
    id, store_id, variant_id, quantity, reserved_quantity, low_stock_threshold,
    availability_status, version, created_at, updated_at
)
SELECT UUID(), s.id, v.id, 0, 0, 0, 'ACTIVE', 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
FROM stores s
JOIN products p ON p.status = 'PUBLISHED' AND p.deleted_at IS NULL
JOIN product_variants v ON v.product_id = p.id AND v.status = 'ACTIVE'
WHERE s.franchise_managed = TRUE AND s.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM franchise_inventory fi
      WHERE fi.store_id = s.id AND fi.variant_id = v.id
  );
