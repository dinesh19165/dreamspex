CREATE TABLE banners (
    id CHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    link_url VARCHAR(1000) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    starts_at DATETIME(6) NULL,
    ends_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_banners_status_order (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE homepage_content (
    id CHAR(36) NOT NULL PRIMARY KEY,
    content_key VARCHAR(120) NOT NULL,
    title VARCHAR(180) NULL,
    body TEXT NULL,
    image_url VARCHAR(1000) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    updated_by CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_homepage_content_key (content_key),
    CONSTRAINT fk_homepage_content_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stores (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    phone VARCHAR(32) NULL,
    address VARCHAR(1000) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_stores_status_city (status, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    KEY ix_services_status_order (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
