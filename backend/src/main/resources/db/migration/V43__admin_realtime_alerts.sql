CREATE TABLE admin_alert_scan_state (
    id INT NOT NULL PRIMARY KEY,
    last_scanned_at DATETIME(6) NOT NULL,
    CONSTRAINT chk_admin_alert_scan_state_id CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_alert_scan_state (id, last_scanned_at)
VALUES (1, CURRENT_TIMESTAMP(6));

CREATE TABLE admin_alerts (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    source_type VARCHAR(24) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    title VARCHAR(180) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    order_number VARCHAR(40) NOT NULL,
    event_at DATETIME(6) NOT NULL,
    acknowledged_at DATETIME(6) NULL,
    resolved_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_admin_alert_source UNIQUE (source_type, source_id),
    KEY ix_admin_alert_status_event (acknowledged_at, resolved_at, event_at),
    KEY ix_admin_alert_event (event_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
