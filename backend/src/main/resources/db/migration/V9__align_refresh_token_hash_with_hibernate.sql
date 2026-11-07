-- RefreshToken.tokenHash is an unbounded Java String mapping and Hibernate
-- validates it as VARCHAR(255), not the historical CHAR(64) definition.
ALTER TABLE refresh_tokens
    MODIFY token_hash VARCHAR(255) NOT NULL;
