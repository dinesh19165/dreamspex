ALTER TABLE banners
    ADD COLUMN desktop_media_type VARCHAR(16) NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN desktop_video_url VARCHAR(1000) NULL,
    ADD COLUMN desktop_video_storage_key VARCHAR(500) NULL;
