package com.dreamspex.notification;

import java.time.Instant;

public final class AdminAlertDtos {
    private AdminAlertDtos() {}

    public record AlertResponse(String id, String type, String title, String sourceId,
                                String customerName, String orderId, String orderNumber,
                                Instant eventAt, Instant acknowledgedAt, Instant resolvedAt) {}
}
