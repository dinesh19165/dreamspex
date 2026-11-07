ALTER TABLE stores
    ADD COLUMN latitude DECIMAL(10,7) NULL,
    ADD COLUMN longitude DECIMAL(10,7) NULL,
    ADD COLUMN delivery_radius_km DECIMAL(8,2) NULL,
    ADD CONSTRAINT ck_stores_coordinate_pair CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
    ADD CONSTRAINT ck_stores_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),
    ADD CONSTRAINT ck_stores_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),
    ADD CONSTRAINT ck_stores_delivery_radius CHECK (
        delivery_radius_km IS NULL OR delivery_radius_km BETWEEN 0.01 AND 10000
    );

ALTER TABLE orders
    ADD COLUMN fulfillment_store_id CHAR(36) NULL,
    ADD CONSTRAINT fk_orders_fulfillment_store
        FOREIGN KEY (fulfillment_store_id) REFERENCES stores(id) ON DELETE SET NULL,
    ADD KEY ix_orders_fulfillment_store (fulfillment_store_id);
