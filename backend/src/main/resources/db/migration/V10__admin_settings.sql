CREATE TABLE admin_settings (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    store_name VARCHAR(180) NOT NULL,
    logo_url VARCHAR(1000) NULL,
    favicon_url VARCHAR(1000) NULL,
    primary_color VARCHAR(7) NOT NULL,
    secondary_color VARCHAR(7) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    shipping_fee DECIMAL(12,2) NOT NULL,
    free_shipping_threshold DECIMAL(12,2) NOT NULL,
    session_timeout_minutes INT NOT NULL,
    email_notifications BOOLEAN NOT NULL,
    order_confirmation_alerts BOOLEAN NOT NULL,
    payment_alerts BOOLEAN NOT NULL,
    new_customer_alerts BOOLEAN NOT NULL,
    low_stock_alerts BOOLEAN NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
