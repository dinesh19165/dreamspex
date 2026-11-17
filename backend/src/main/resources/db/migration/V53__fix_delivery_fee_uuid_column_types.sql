-- V52 created the delivery fee UUID keys as CHAR(36), but the Java String IDs are
-- mapped as VARCHAR(255) throughout the application and Hibernate validates against
-- that type. Convert the existing delivery fee columns without altering the values.

ALTER TABLE delivery_fee_slabs
    DROP FOREIGN KEY fk_delivery_fee_slab_policy;
ALTER TABLE delivery_fee_policies
    DROP FOREIGN KEY fk_delivery_fee_policy_store;

ALTER TABLE delivery_fee_policies
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY store_id VARCHAR(255) NULL;

ALTER TABLE delivery_fee_slabs
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY policy_id VARCHAR(255) NOT NULL;

ALTER TABLE orders
    MODIFY delivery_fee_policy_id VARCHAR(255) NULL,
    MODIFY delivery_fee_slab_id VARCHAR(255) NULL;

ALTER TABLE delivery_fee_policies
    ADD CONSTRAINT fk_delivery_fee_policy_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE delivery_fee_slabs
    ADD CONSTRAINT fk_delivery_fee_slab_policy
        FOREIGN KEY (policy_id) REFERENCES delivery_fee_policies(id) ON DELETE CASCADE;
