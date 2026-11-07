-- Java numeric fields use Hibernate's signed INTEGER/BIGINT mappings.
-- Remove unsigned/narrow MySQL modifiers that fail schema validation.

ALTER TABLE users
    MODIFY failed_login_count INT NOT NULL DEFAULT 0,
    MODIFY token_version INT NOT NULL DEFAULT 0;

ALTER TABLE otp_challenges
    MODIFY attempts INT NOT NULL DEFAULT 0,
    MODIFY resend_count INT NOT NULL DEFAULT 0;

ALTER TABLE product_variants
    MODIFY quantity INT NOT NULL DEFAULT 0,
    MODIFY reserved_quantity INT NOT NULL DEFAULT 0,
    MODIFY version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE cart_items
    MODIFY quantity INT NOT NULL;

ALTER TABLE order_items
    MODIFY quantity INT NOT NULL;

ALTER TABLE prescriptions
    MODIFY right_axis INT NULL,
    MODIFY left_axis INT NULL;

ALTER TABLE prescription_files
    MODIFY size_bytes BIGINT NOT NULL;

ALTER TABLE membership_plans
    MODIFY duration_days INT NOT NULL;
