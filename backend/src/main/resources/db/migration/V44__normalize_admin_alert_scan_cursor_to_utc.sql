UPDATE admin_alert_scan_state
SET last_scanned_at = UTC_TIMESTAMP(6) - INTERVAL 5 MINUTE
WHERE id = 1;
