package com.dreamspex.notification;

import java.time.Instant;

public final class CustomerSmsDtos {
    private CustomerSmsDtos() {}

    public record AdminSmsNotification(
            String id,
            String orderNumber,
            String maskedPhoneNumber,
            String notificationType,
            String status,
            String providerMessageId,
            Instant timestamp
    ) {}
}
