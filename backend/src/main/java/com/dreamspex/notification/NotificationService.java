package com.dreamspex.notification;

import com.dreamspex.auth.entity.User;
import com.dreamspex.order.Order;
import com.dreamspex.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.prescription.PrescriptionDtos.NotificationResponse;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final CurrentUser current;
    private final CustomerSmsNotificationService smsNotifications;

    public NotificationService(NotificationRepository notifications, CurrentUser current,
                               CustomerSmsNotificationService smsNotifications) {
        this.notifications = notifications;
        this.current = current;
        this.smsNotifications = smsNotifications;
    }

    @Transactional
    public void create(User user, String type, String title, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notifications.save(notification);
    }

    public void enqueueSms(String eventKey, String notificationType, Order order,
                           Map<String, String> variables) {
        smsNotifications.enqueue(eventKey, notificationType, order, variables);
    }

    public void enqueueSms(String eventKey, String notificationType, User user, String orderId,
                           String orderNumber, Map<String, String> variables, Instant expiresAt) {
        smsNotifications.enqueue(eventKey, notificationType, user, orderId, orderNumber, variables, expiresAt);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Authentication authentication) {
        return notifications.findByUserIdOrderByCreatedAtDesc(current.require(authentication).getId()).stream()
                .map(notification -> new NotificationResponse(notification.getId(), notification.getType(),
                        notification.getTitle(), notification.getMessage(), notification.getCreatedAt(),
                        notification.getReadAt()))
                .toList();
    }

    @Transactional
    public void markRead(Authentication authentication, String id) {
        Notification notification = notifications.findById(id)
                .filter(value -> value.getUser().getId().equals(current.require(authentication).getId()))
                .orElseThrow();
        notification.setReadAt(Instant.now());
    }
}
