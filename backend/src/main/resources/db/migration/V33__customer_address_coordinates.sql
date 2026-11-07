ALTER TABLE addresses
    ADD COLUMN latitude DECIMAL(10,7) NULL,
    ADD COLUMN longitude DECIMAL(10,7) NULL,
    ADD CONSTRAINT ck_addresses_coordinate_pair CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
    ADD CONSTRAINT ck_addresses_latitude_range CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),
    ADD CONSTRAINT ck_addresses_longitude_range CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    );
