ALTER TABLE delivery_batch_links
    ADD COLUMN token_ciphertext VARCHAR(512) NULL AFTER token_hash;
