ALTER TABLE otp_challenges
    MODIFY code_hash VARCHAR(255) NULL,
    ADD COLUMN provider_request_id VARCHAR(255) NULL;
