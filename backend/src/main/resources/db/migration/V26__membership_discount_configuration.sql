ALTER TABLE membership_plans
    ADD COLUMN discount_percentage DECIMAL(5,2) NULL,
    ADD COLUMN recommended BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders
    ADD COLUMN membership_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;
