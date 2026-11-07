-- V13 created homepage_sections.updated_by as CHAR(36), while users.id was
-- aligned to VARCHAR(255) in V7. Keep the audit relationship and records,
-- changing only the foreign-key column type to match its referenced key.

ALTER TABLE homepage_sections
    DROP FOREIGN KEY fk_homepage_section_user;

ALTER TABLE homepage_sections
    MODIFY updated_by VARCHAR(255) NULL;

ALTER TABLE homepage_sections
    ADD CONSTRAINT fk_homepage_section_user
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
