-- Align Java String columns with Hibernate's VARCHAR mappings without changing
-- the values or the existing import-history relationship.

ALTER TABLE product_import_jobs
    DROP FOREIGN KEY fk_product_import_jobs_user;

ALTER TABLE product_import_jobs
    MODIFY id VARCHAR(36) NOT NULL,
    MODIFY created_by VARCHAR(36) NOT NULL,
    MODIFY workbook_sha256 VARCHAR(64) NOT NULL,
    MODIFY images_sha256 VARCHAR(64) NULL;

ALTER TABLE product_import_jobs
    ADD CONSTRAINT fk_product_import_jobs_user
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
