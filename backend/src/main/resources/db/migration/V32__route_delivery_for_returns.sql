ALTER TABLE delivery_batches
    ADD COLUMN operation_type VARCHAR(32) NOT NULL DEFAULT 'NORMAL_DELIVERY';

ALTER TABLE delivery_batch_orders
    MODIFY COLUMN order_id VARCHAR(255) NULL,
    ADD COLUMN return_request_id VARCHAR(255) NULL,
    ADD COLUMN active_return_request_id VARCHAR(255) NULL,
    ADD UNIQUE KEY uk_delivery_active_return_request (active_return_request_id),
    ADD KEY ix_delivery_batch_orders_return_request (return_request_id),
    ADD CONSTRAINT fk_delivery_batch_orders_return_request FOREIGN KEY (return_request_id)
        REFERENCES return_requests(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_delivery_batch_orders_active_return_request FOREIGN KEY (active_return_request_id)
        REFERENCES return_requests(id) ON DELETE RESTRICT,
    ADD CONSTRAINT ck_delivery_batch_orders_one_target CHECK (
        (order_id IS NULL AND return_request_id IS NOT NULL)
        OR (order_id IS NOT NULL AND return_request_id IS NULL)
    );
