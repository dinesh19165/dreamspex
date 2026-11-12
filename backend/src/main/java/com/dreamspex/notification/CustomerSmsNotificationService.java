package com.dreamspex.notification;

import com.dreamspex.auth.PhoneNumberNormalizer;
import com.dreamspex.auth.entity.User;
import com.dreamspex.order.Order;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerSmsNotificationService {
    public static final int MAX_ATTEMPTS = 8;
    private static final Duration PROCESSING_LEASE = Duration.ofMinutes(10);
    private final CustomerSmsNotificationRepository notifications;
    private final SmsProperties properties;
    private final ObjectMapper mapper;
    private final SmsTemplateDataCipher templateDataCipher;

    public CustomerSmsNotificationService(CustomerSmsNotificationRepository notifications,
                                          SmsProperties properties, ObjectMapper mapper,
                                          SmsTemplateDataCipher templateDataCipher) {
        this.notifications = notifications;
        this.properties = properties;
        this.mapper = mapper;
        this.templateDataCipher = templateDataCipher;
    }

    @Transactional
    public void enqueue(String eventKey, String notificationType, Order order, Map<String, String> variables) {
        enqueue(eventKey, notificationType, order.getUser(), order.getId(), order.getOrderNumber(),
                variables, null);
    }

    @Transactional
    public void enqueue(String eventKey, String notificationType, User user, String orderId,
                        String orderNumber, Map<String, String> variables, Instant expiresAt) {
        String phoneNumber = user.getPhoneVerifiedAt() == null
                ? null : PhoneNumberNormalizer.normalize(user.getPhone());
        if (phoneNumber == null || !phoneNumber.startsWith("+91")
                || notifications.existsByEventKey(eventKey)) return;

        CustomerSmsNotification notification = new CustomerSmsNotification();
        notification.setEventKey(eventKey);
        notification.setUserId(user.getId());
        notification.setOrderId(orderId);
        notification.setOrderNumber(orderNumber);
        notification.setPhoneNumber(phoneNumber);
        notification.setNotificationType(notificationType);
        notification.setTemplateId(properties.templateId(notificationType));
        notification.setTemplateVariablesEncrypted(writeVariables(variables));
        notification.setExpiresAt(expiresAt);
        if ("MSG91".equalsIgnoreCase(properties.getProvider()) && notification.getTemplateId() == null) {
            notification.setStatus("FAILED");
            notification.setAttempts(MAX_ATTEMPTS);
            notification.setLastError("No approved DLT template ID is configured for this event.");
            notification.setNextAttemptAt(Instant.now());
        }
        notifications.save(notification);
    }

    @Transactional
    public List<String> claimReadyBatch() {
        Instant now = Instant.now();
        List<CustomerSmsNotification> ready =
                notifications.findReadyForDelivery(now, MAX_ATTEMPTS, PageRequest.of(0, 25));
        for (CustomerSmsNotification notification : ready) {
            notification.setStatus("PROCESSING");
            notification.setAttempts(notification.getAttempts() + 1);
            notification.setNextAttemptAt(now.plus(PROCESSING_LEASE));
            notification.setUpdatedAt(now);
        }
        return ready.stream().map(CustomerSmsNotification::getId).toList();
    }

    @Transactional(readOnly = true)
    public Optional<SmsDelivery> loadClaimed(String id) {
        return notifications.findByIdAndStatus(id, "PROCESSING")
                .map(notification -> new SmsDelivery(notification.getId(), notification.getPhoneNumber(),
                        notification.getTemplateId(), readVariables(notification.getTemplateVariablesEncrypted()),
                        notification.getAttempts(), notification.getExpiresAt()));
    }

    @Transactional
    public void markSent(String id, String providerMessageId) {
        notifications.findByIdAndStatus(id, "PROCESSING").ifPresent(notification -> {
            Instant now = Instant.now();
            notification.setStatus("SENT");
            notification.setProviderMessageId(providerMessageId);
            notification.setSentAt(now);
            notification.setUpdatedAt(now);
            notification.setNextAttemptAt(now);
            notification.setLastError(null);
        });
    }

    @Transactional
    public void markFailed(String id, int attempt, String message, boolean retryable) {
        notifications.findByIdAndStatus(id, "PROCESSING").ifPresent(notification -> {
            Instant now = Instant.now();
            boolean willRetry = retryable && attempt < MAX_ATTEMPTS
                    && (notification.getExpiresAt() == null || notification.getExpiresAt().isAfter(now));
            notification.setStatus("FAILED");
            if (!willRetry) notification.setAttempts(MAX_ATTEMPTS);
            notification.setLastError(message.substring(0, Math.min(message.length(), 500)));
            notification.setNextAttemptAt(willRetry ? now.plus(retryDelay(attempt)) : now);
            notification.setUpdatedAt(now);
        });
    }

    private Duration retryDelay(int attempt) {
        long seconds = Math.min(60L << Math.min(attempt - 1, 6), 3600L);
        return Duration.ofSeconds(seconds);
    }

    private String writeVariables(Map<String, String> variables) {
        try {
            return templateDataCipher.encrypt(mapper.writeValueAsString(new LinkedHashMap<>(variables)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("SMS template variables could not be serialized.", exception);
        }
    }

    private Map<String, String> readVariables(String value) {
        try {
            return mapper.readValue(templateDataCipher.decrypt(value), new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored SMS template variables are invalid.", exception);
        }
    }

    public record SmsDelivery(String id, String phoneNumber, String templateId,
                              Map<String, String> variables, int attempts, Instant expiresAt) {}
}
