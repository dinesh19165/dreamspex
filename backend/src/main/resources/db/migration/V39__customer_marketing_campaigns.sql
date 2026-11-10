ALTER TABLE customer_profiles
    ADD COLUMN whatsapp_marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN whatsapp_marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN whatsapp_consent_at DATETIME(6) NULL,
    ADD COLUMN whatsapp_consent_source VARCHAR(80) NULL;

CREATE TABLE marketing_campaigns (
    id CHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    content VARCHAR(4000) NOT NULL,
    offer_details VARCHAR(1000) NULL,
    coupon_code VARCHAR(64) NULL,
    offer_expires_on DATE NULL,
    image_url VARCHAR(1000) NULL,
    channel VARCHAR(24) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    audience_size INT UNSIGNED NOT NULL DEFAULT 0,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_marketing_campaign_created (created_at),
    CONSTRAINT fk_marketing_campaign_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marketing_campaign_recipients (
    id CHAR(36) NOT NULL PRIMARY KEY,
    campaign_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_SENT',
    provider_message_id VARCHAR(180) NULL,
    failure_reason VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_marketing_campaign_recipient (campaign_id, user_id),
    KEY ix_marketing_recipient_campaign_status (campaign_id, status),
    CONSTRAINT fk_marketing_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketing_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
