ALTER TABLE orders
    DROP FOREIGN KEY fk_orders_fulfillment_store;

ALTER TABLE orders
    MODIFY COLUMN fulfillment_store_id VARCHAR(255) NULL;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_fulfillment_store_v35
        FOREIGN KEY (fulfillment_store_id) REFERENCES stores(id) ON DELETE SET NULL;
