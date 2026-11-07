ALTER TABLE admin_settings
    ADD COLUMN smtp_host VARCHAR(255) NULL,
    ADD COLUMN smtp_port INT NULL,
    ADD COLUMN smtp_username VARCHAR(255) NULL,
    ADD COLUMN smtp_password_encrypted VARCHAR(2000) NULL,
    ADD COLUMN from_email VARCHAR(320) NULL,
    ADD COLUMN sender_display_name VARCHAR(180) NULL,
    ADD COLUMN smtp_tls_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN smtp_ssl_enabled BOOLEAN NOT NULL DEFAULT FALSE;
