package com.dreamspex.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "admin_alert_scan_state")
public class AdminAlertScanState {
    @Id
    private Integer id = 1;

    @Column(name = "last_scanned_at", nullable = false)
    private Instant lastScannedAt;

    protected AdminAlertScanState() {}

    public AdminAlertScanState(Instant lastScannedAt) {
        this.lastScannedAt = lastScannedAt;
    }

    public Integer getId() { return id; }
    public Instant getLastScannedAt() { return lastScannedAt; }
    public void setLastScannedAt(Instant value) { lastScannedAt = value; }
}
