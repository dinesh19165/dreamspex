package com.dreamspex.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dreamspex.auth.entity.User;
import com.dreamspex.order.Order;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;

@ExtendWith(MockitoExtension.class)
class CustomerSmsNotificationServiceTest {
    private static final String OTP_SECRET = "local-sms-test-secret-with-at-least-thirty-two-bytes";
    @Mock CustomerSmsNotificationRepository notifications;
    private SmsProperties properties;
    private SmsTemplateDataCipher templateDataCipher;
    private CustomerSmsNotificationService service;

    @BeforeEach
    void setUp() {
        properties = new SmsProperties();
        templateDataCipher = new SmsTemplateDataCipher(OTP_SECRET);
        service = new CustomerSmsNotificationService(notifications, properties, new ObjectMapper(),
                templateDataCipher);
    }

    @Test
    void enqueuesOnlyForVerifiedIndianNumbersAndUsesConfiguredFlowId() {
        properties.setEnvironment(new MockEnvironment()
                .withProperty("DREAMSPEX_SMS_TEMPLATES_ORDER_PLACED", "approved-flow-123"));
        User user = verifiedUser("+919876543210");
        Order order = order(user);
        when(notifications.existsByEventKey("order:123:ORDER_PLACED")).thenReturn(false);

        service.enqueue("order:123:ORDER_PLACED", "ORDER_PLACED", order, Map.of("VAR1", "DS-123"));

        ArgumentCaptor<CustomerSmsNotification> captor = ArgumentCaptor.forClass(CustomerSmsNotification.class);
        verify(notifications).save(captor.capture());
        assertEquals("+919876543210", captor.getValue().getPhoneNumber());
        assertEquals("approved-flow-123", captor.getValue().getTemplateId());
        assertEquals("PENDING", captor.getValue().getStatus());
        assertTrue(templateDataCipher.decrypt(captor.getValue().getTemplateVariablesEncrypted()).contains("DS-123"));
    }

    @Test
    void doesNotEnqueueUnverifiedOrDuplicateNotifications() {
        User unverified = new User();
        unverified.setPhone("+919876543210");
        service.enqueue("event-1", "ORDER_PLACED", unverified, "order-1", "DS-1", Map.of(), null);

        User verified = verifiedUser("+919876543210");
        when(notifications.existsByEventKey("event-2")).thenReturn(true);
        service.enqueue("event-2", "ORDER_PLACED", verified, "order-1", "DS-1", Map.of(), null);

        verify(notifications, never()).save(any());
    }

    @Test
    void queuesOtpWithExpiryAndNeverUsesAddressOrDeliveryWorkerNumber() {
        User user = verifiedUser("+919876543210");
        Instant expiry = Instant.now().plusSeconds(120);
        when(notifications.existsByEventKey("otp-event")).thenReturn(false);

        service.enqueue("otp-event", "DELIVERY_OTP", user, "order-1", "DS-1",
                Map.of("VAR1", "DS-1", "VAR2", "143209"), expiry);

        ArgumentCaptor<CustomerSmsNotification> captor = ArgumentCaptor.forClass(CustomerSmsNotification.class);
        verify(notifications).save(captor.capture());
        assertEquals(user.getPhone(), captor.getValue().getPhoneNumber());
        assertEquals(expiry, captor.getValue().getExpiresAt());
        assertFalse(captor.getValue().getTemplateVariablesEncrypted().contains("143209"));
        assertTrue(templateDataCipher.decrypt(captor.getValue().getTemplateVariablesEncrypted()).contains("143209"));
    }

    @Test
    void recordsProviderFailureForRetryAndStopsRetryingWhenPermanent() {
        CustomerSmsNotification notification = new CustomerSmsNotification();
        notification.setStatus("PROCESSING");
        notification.setAttempts(1);
        when(notifications.findByIdAndStatus("sms-1", "PROCESSING")).thenReturn(Optional.of(notification));

        service.markFailed("sms-1", 1, "MSG91 could not be reached.", true);

        assertEquals("FAILED", notification.getStatus());
        assertEquals(1, notification.getAttempts());
        assertTrue(notification.getNextAttemptAt().isAfter(Instant.now()));

        notification.setStatus("PROCESSING");
        service.markFailed("sms-1", 2, "Invalid destination.", false);

        assertEquals(CustomerSmsNotificationService.MAX_ATTEMPTS, notification.getAttempts());
        assertFalse(notification.getNextAttemptAt().isAfter(Instant.now().plusSeconds(1)));
    }

    @Test
    void mockProviderNeverNeedsCredentialsOrTemplateId() {
        String messageId = new MockSmsGateway().send("+919876543210", null, Map.of("VAR1", "DS-1"));

        assertTrue(messageId.startsWith("mock-"));
    }

    @Test
    void resolvesTheApprovedTemplateFromTheNamedEnvironmentVariable() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("DREAMSPEX_SMS_TEMPLATES_ORDER_PLACED", "approved-flow-456");
        properties.setEnvironment(environment);

        assertEquals("approved-flow-456", properties.templateId("ORDER_PLACED"));
    }

    private User verifiedUser(String phone) {
        User user = new User();
        user.setPhone(phone);
        user.setPhoneVerifiedAt(Instant.now());
        return user;
    }

    private Order order(User user) {
        Order order = new Order();
        order.setUser(user);
        order.setOrderNumber("DS-123");
        return order;
    }
}
