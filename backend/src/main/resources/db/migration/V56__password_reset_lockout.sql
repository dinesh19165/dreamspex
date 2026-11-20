ALTER TABLE otp_challenges
    ADD COLUMN locked_until DATETIME(6) NULL;
