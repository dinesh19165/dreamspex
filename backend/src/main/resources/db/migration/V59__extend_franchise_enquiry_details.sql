ALTER TABLE franchise_applications
    MODIFY email VARCHAR(255) NULL,
    MODIFY full_address TEXT NULL,
    MODIFY investment_budget DECIMAL(14,2) NULL,
    MODIFY preferred_store_format VARCHAR(100) NULL,
    ADD COLUMN current_occupation VARCHAR(160) NULL,
    ADD COLUMN available_investment_range VARCHAR(120) NULL,
    ADD COLUMN preferred_store_location VARCHAR(255) NULL,
    ADD COLUMN owns_commercial_property BOOLEAN NULL;
