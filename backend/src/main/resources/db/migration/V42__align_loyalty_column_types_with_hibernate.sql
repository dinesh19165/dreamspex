-- Loyalty and referral IDs are Java String fields, so Hibernate expects VARCHAR.
-- Drop only foreign keys that depend on the columns being altered; their indexes,
-- primary keys, and unique constraints remain in place.

ALTER TABLE loyalty_accounts
    DROP FOREIGN KEY fk_loyalty_accounts_user;

ALTER TABLE loyalty_transactions
    DROP FOREIGN KEY fk_loyalty_transactions_user,
    DROP FOREIGN KEY fk_loyalty_transactions_order;

ALTER TABLE loyalty_point_lots
    DROP FOREIGN KEY fk_loyalty_lots_user,
    DROP FOREIGN KEY fk_loyalty_lots_transaction;

ALTER TABLE referral_codes
    DROP FOREIGN KEY fk_referral_codes_user;

ALTER TABLE referrals
    DROP FOREIGN KEY fk_referrals_referrer,
    DROP FOREIGN KEY fk_referrals_referred,
    DROP FOREIGN KEY fk_referrals_order;

ALTER TABLE wallet_accounts
    DROP FOREIGN KEY fk_wallet_accounts_user;

ALTER TABLE wallet_transactions
    DROP FOREIGN KEY fk_wallet_transactions_user;

ALTER TABLE loyalty_settings
    MODIFY id INT NOT NULL;

ALTER TABLE referral_settings
    MODIFY id INT NOT NULL;

ALTER TABLE loyalty_accounts
    MODIFY user_id VARCHAR(255) NOT NULL;

ALTER TABLE loyalty_transactions
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY order_id VARCHAR(255) NULL;

ALTER TABLE loyalty_point_lots
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY transaction_id VARCHAR(255) NOT NULL;

ALTER TABLE referral_codes
    MODIFY user_id VARCHAR(255) NOT NULL;

ALTER TABLE referrals
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY referrer_id VARCHAR(255) NOT NULL,
    MODIFY referred_user_id VARCHAR(255) NOT NULL,
    MODIFY qualifying_order_id VARCHAR(255) NULL;

ALTER TABLE wallet_accounts
    MODIFY user_id VARCHAR(255) NOT NULL;

ALTER TABLE wallet_transactions
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL;

ALTER TABLE orders
    MODIFY loyalty_points_redeemed INT NOT NULL DEFAULT 0;

ALTER TABLE loyalty_accounts
    ADD CONSTRAINT fk_loyalty_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE loyalty_transactions
    ADD CONSTRAINT fk_loyalty_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_loyalty_transactions_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

ALTER TABLE loyalty_point_lots
    ADD CONSTRAINT fk_loyalty_lots_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_loyalty_lots_transaction
        FOREIGN KEY (transaction_id) REFERENCES loyalty_transactions(id) ON DELETE RESTRICT;

ALTER TABLE referral_codes
    ADD CONSTRAINT fk_referral_codes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE referrals
    ADD CONSTRAINT fk_referrals_referrer
        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_referrals_referred
        FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_referrals_order
        FOREIGN KEY (qualifying_order_id) REFERENCES orders(id) ON DELETE RESTRICT;

ALTER TABLE wallet_accounts
    ADD CONSTRAINT fk_wallet_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT fk_wallet_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
