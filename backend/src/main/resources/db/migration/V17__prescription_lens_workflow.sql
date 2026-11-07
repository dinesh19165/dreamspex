ALTER TABLE prescriptions
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN expiry_date DATE NULL,
    ADD COLUMN right_pd DECIMAL(6,2) NULL,
    ADD COLUMN left_pd DECIMAL(6,2) NULL,
    ADD COLUMN extraction_status VARCHAR(24) NOT NULL DEFAULT 'NOT_RUN',
    ADD COLUMN extraction_confidence DECIMAL(5,2) NULL,
    ADD COLUMN customer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN product_id VARCHAR(255) NULL,
    ADD COLUMN order_id VARCHAR(255) NULL,
    ADD COLUMN selected_lens_codes TEXT NULL,
    ADD KEY ix_prescriptions_product (product_id),
    ADD KEY ix_prescriptions_order (order_id);

UPDATE prescriptions SET customer_confirmed = TRUE WHERE status <> 'DRAFT';
ALTER TABLE prescriptions MODIFY status VARCHAR(24) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE prescriptions
    ADD CONSTRAINT fk_prescriptions_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_prescriptions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

CREATE TABLE lens_options (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(32) NOT NULL,
    benefits VARCHAR(1000) NOT NULL,
    additional_cost DECIMAL(12,2) NULL,
    preparation_days INT NULL,
    available BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_lens_options_code (code),
    KEY ix_lens_options_available_category (available, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO lens_options (id, code, name, category, benefits, additional_cost, preparation_days, available, created_at, updated_at)
VALUES (UUID(), 'SINGLE_VISION', 'Single Vision', 'TYPE', 'One prescription power throughout each lens.', 0.00, NULL, TRUE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'BIFOCAL', 'Bifocal', 'TYPE', 'Two distinct vision zones.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'PROGRESSIVE', 'Progressive', 'TYPE', 'Multiple vision zones with a gradual transition.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'BLUE_LIGHT', 'Blue Light Protection', 'COATING', 'Optional lens coating.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'ANTI_REFLECTIVE', 'Anti-Reflective Coating', 'COATING', 'Optional lens coating.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'UV_PROTECTION', 'UV Protection', 'COATING', 'Optional lens treatment.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'PHOTOCHROMIC', 'Photochromic Lenses', 'COATING', 'Lenses that adjust tint with light exposure.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
       (UUID(), 'HIGH_INDEX', 'High-Index Lenses', 'MATERIAL', 'A thinner lens material option.', NULL, NULL, FALSE, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6));

ALTER TABLE cart_items
    ADD COLUMN prescription_id VARCHAR(255) NULL,
    ADD COLUMN selected_lens_codes VARCHAR(1000) NULL,
    ADD COLUMN lens_additional_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD CONSTRAINT fk_cart_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;

ALTER TABLE order_items
    ADD COLUMN prescription_id VARCHAR(255) NULL,
    ADD COLUMN selected_lens_codes VARCHAR(1000) NULL,
    ADD COLUMN lens_additional_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD CONSTRAINT fk_order_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;
