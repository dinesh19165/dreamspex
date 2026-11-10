CREATE TABLE loyalty_settings (
    id TINYINT NOT NULL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    points_per_hundred INT NOT NULL DEFAULT 5,
    minimum_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    minimum_redemption_points INT NOT NULL DEFAULT 100,
    redemption_points INT NOT NULL DEFAULT 100,
    redemption_amount DECIMAL(12,2) NOT NULL DEFAULT 10,
    maximum_redemption_percent DECIMAL(5,2) NOT NULL DEFAULT 20,
    points_expiry_days INT NOT NULL DEFAULT 365,
    product_purchase_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT chk_loyalty_settings_id CHECK (id = 1),
    CONSTRAINT chk_loyalty_points_per_hundred CHECK (points_per_hundred >= 0),
    CONSTRAINT chk_loyalty_redemption CHECK (minimum_redemption_points >= 0 AND redemption_points > 0),
    CONSTRAINT chk_loyalty_expiry CHECK (points_expiry_days > 0),
    CONSTRAINT chk_loyalty_maximum_percent CHECK (maximum_redemption_percent >= 0 AND maximum_redemption_percent <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE referral_settings (
    id TINYINT NOT NULL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reward_type VARCHAR(24) NOT NULL DEFAULT 'LOYALTY_POINTS',
    referrer_reward_amount INT NOT NULL DEFAULT 100,
    new_customer_reward_amount INT NOT NULL DEFAULT 50,
    minimum_purchase_amount DECIMAL(12,2) NOT NULL DEFAULT 500,
    reward_expiry_days INT NOT NULL DEFAULT 365,
    maximum_rewards_per_customer INT NOT NULL DEFAULT 10,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT chk_referral_settings_id CHECK (id = 1),
    CONSTRAINT chk_referral_reward_type CHECK (reward_type IN ('WALLET_CREDIT', 'LOYALTY_POINTS')),
    CONSTRAINT chk_referral_rewards CHECK (referrer_reward_amount >= 0 AND new_customer_reward_amount >= 0),
    CONSTRAINT chk_referral_expiry CHECK (reward_expiry_days > 0),
    CONSTRAINT chk_referral_maximum CHECK (maximum_rewards_per_customer > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO loyalty_settings (id, updated_at) VALUES (1, CURRENT_TIMESTAMP(6));
INSERT INTO referral_settings (id, updated_at) VALUES (1, CURRENT_TIMESTAMP(6));

ALTER TABLE orders
    ADD COLUMN loyalty_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_amount,
    ADD COLUMN loyalty_points_redeemed INT UNSIGNED NOT NULL DEFAULT 0 AFTER loyalty_discount_amount;

CREATE TABLE loyalty_accounts (
    user_id CHAR(36) NOT NULL PRIMARY KEY,
    available_points BIGINT NOT NULL DEFAULT 0,
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_redeemed BIGINT NOT NULL DEFAULT 0,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_loyalty_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_loyalty_account_balances CHECK (available_points >= 0 AND total_earned >= 0 AND total_redeemed >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loyalty_transactions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    order_id CHAR(36) NULL,
    transaction_type VARCHAR(32) NOT NULL,
    points_delta BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    reference_key VARCHAR(180) NOT NULL,
    description VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_loyalty_transaction_reference (reference_key),
    KEY ix_loyalty_transactions_user_created (user_id, created_at),
    KEY ix_loyalty_transactions_expiry (user_id, expires_at),
    CONSTRAINT fk_loyalty_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loyalty_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loyalty_point_lots (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    transaction_id CHAR(36) NOT NULL,
    original_points BIGINT NOT NULL,
    remaining_points BIGINT NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    KEY ix_loyalty_lots_spendable (user_id, expires_at, remaining_points),
    CONSTRAINT fk_loyalty_lots_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_loyalty_lots_transaction FOREIGN KEY (transaction_id) REFERENCES loyalty_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT chk_loyalty_lots_points CHECK (original_points > 0 AND remaining_points >= 0 AND remaining_points <= original_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE referral_codes (
    user_id CHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_referral_codes_code (code),
    CONSTRAINT fk_referral_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE referrals (
    id CHAR(36) NOT NULL PRIMARY KEY,
    referrer_id CHAR(36) NOT NULL,
    referred_user_id CHAR(36) NOT NULL,
    referral_code VARCHAR(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    qualifying_order_id CHAR(36) NULL,
    reward_type VARCHAR(24) NULL,
    referrer_reward_amount INT NULL,
    new_customer_reward_amount INT NULL,
    created_at DATETIME(6) NOT NULL,
    qualified_at DATETIME(6) NULL,
    UNIQUE KEY uk_referrals_referred_user (referred_user_id),
    UNIQUE KEY uk_referrals_qualifying_order (qualifying_order_id),
    KEY ix_referrals_referrer_status (referrer_id, status, created_at),
    CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_referrals_order FOREIGN KEY (qualifying_order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT chk_referrals_reward_type CHECK (reward_type IS NULL OR reward_type IN ('WALLET_CREDIT', 'LOYALTY_POINTS')),
    CONSTRAINT chk_referrals_status CHECK (status IN ('PENDING', 'SUCCESSFUL', 'LIMIT_REACHED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wallet_accounts (
    user_id CHAR(36) NOT NULL PRIMARY KEY,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_credited DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_debited DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_wallet_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_wallet_balances CHECK (balance >= 0 AND total_credited >= 0 AND total_debited >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wallet_transactions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    amount_delta DECIMAL(12,2) NOT NULL,
    reference_key VARCHAR(180) NOT NULL,
    description VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_wallet_transaction_reference (reference_key),
    KEY ix_wallet_transactions_user_created (user_id, created_at),
    CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
