CREATE TABLE order_confirmation_emails (
    id CHAR(36) NOT NULL PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    sent_at DATETIME(6) NULL,
    last_error VARCHAR(500) NULL,
    updated_at DATETIME(6) NOT NULL,
    UNIQUE KEY uk_order_confirmation_email_order (order_id),
    CONSTRAINT fk_order_confirmation_email_order FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
