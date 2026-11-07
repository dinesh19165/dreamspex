ALTER TABLE return_refund_transactions
    ADD COLUMN gateway_created_at DATETIME(6) NULL,
    ADD COLUMN gateway_updated_at DATETIME(6) NULL;
