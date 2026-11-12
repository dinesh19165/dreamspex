package com.dreamspex.notification;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import static com.dreamspex.notification.CustomerSmsDtos.AdminSmsNotification;

@RestController
@RequestMapping("/api/v1/admin/sms-notifications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminCustomerSmsController {
    private final CustomerSmsNotificationRepository notifications;

    public AdminCustomerSmsController(CustomerSmsNotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public List<AdminSmsNotification> list() {
        return notifications.findTop500ByOrderByCreatedAtDesc().stream()
                .map(notification -> new AdminSmsNotification(notification.getId(), notification.getOrderNumber(),
                        mask(notification.getPhoneNumber()), notification.getNotificationType(),
                        notification.getStatus().equals("PROCESSING") ? "PENDING" : notification.getStatus(),
                        notification.getProviderMessageId(), notification.getCreatedAt()))
                .toList();
    }

    private String mask(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) return "Unavailable";
        return "******" + phoneNumber.substring(phoneNumber.length() - 4);
    }
}
