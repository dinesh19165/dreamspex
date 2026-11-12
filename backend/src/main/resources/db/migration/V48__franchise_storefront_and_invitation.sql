ALTER TABLE franchise_users
    ADD COLUMN invitation_token_hash CHAR(64) NULL,
    ADD COLUMN invitation_expires_at DATETIME(6) NULL,
    ADD UNIQUE KEY uk_franchise_user_invitation_token (invitation_token_hash);

CREATE INDEX ix_franchise_inventory_store_availability
    ON franchise_inventory (store_id, availability_status, quantity, reserved_quantity);
