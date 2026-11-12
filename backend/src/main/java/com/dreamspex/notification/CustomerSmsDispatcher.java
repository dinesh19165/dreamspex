package com.dreamspex.notification;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CustomerSmsDispatcher {
    private static final Logger log = LoggerFactory.getLogger(CustomerSmsDispatcher.class);
    private final CustomerSmsNotificationService notifications;
    private final SmsGateway gateway;

    public CustomerSmsDispatcher(CustomerSmsNotificationService notifications, SmsGateway gateway) {
        this.notifications = notifications;
        this.gateway = gateway;
    }

    @Scheduled(fixedDelayString = "${dreamspex.sms.dispatch-delay-ms:5000}", scheduler = "smsTaskScheduler")
    public void dispatch() {
        for (String id : notifications.claimReadyBatch()) send(id);
    }

    private void send(String id) {
        var delivery = notifications.loadClaimed(id)
                .orElseThrow(() -> new IllegalStateException("Claimed SMS notification could not be reloaded."));
        if (delivery.expiresAt() != null && !delivery.expiresAt().isAfter(Instant.now())) {
            notifications.markFailed(id, delivery.attempts(), "The delivery OTP expired before SMS delivery.", false);
            return;
        }
        try {
            String messageId = gateway.send(delivery.phoneNumber(), delivery.templateId(), delivery.variables());
            notifications.markSent(id, messageId);
        } catch (SmsProviderException exception) {
            log.warn("SMS delivery failed for notification {} (attempt {}): {}",
                    id, delivery.attempts(), exception.getMessage());
            notifications.markFailed(id, delivery.attempts(), exception.getMessage(), exception.isRetryable());
        }
    }
}
