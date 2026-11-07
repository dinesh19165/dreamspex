package com.dreamspex.admin;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public final class AdminSettingsDtos {
    private AdminSettingsDtos() {}
    public record SettingsResponse(String storeName, String logoUrl, String faviconUrl, String primaryColor,
            String secondaryColor, String currency, BigDecimal shippingFee, BigDecimal freeShippingThreshold,
            int sessionTimeoutMinutes, Notifications notifications, SecurityProfile security,
            Integrations integrations, EmailConfiguration email) {}
    public record Notifications(boolean emailNotifications, boolean orderConfirmationAlerts, boolean paymentAlerts,
            boolean newCustomerAlerts, boolean lowStockAlerts) {}
    public record SecurityProfile(String adminName, String adminEmail, String passwordPolicy) {}
    public record Integrations(boolean razorpayConfigured, boolean smtpConfigured, boolean smsConfigured,
            boolean whatsappConfigured) {}
    public record EmailConfiguration(String smtpHost, Integer smtpPort, String smtpUsername, boolean passwordConfigured,
            String fromEmail, String senderDisplayName, boolean tlsEnabled, boolean sslEnabled, boolean enabled) {}
    public record SettingsRequest(@NotBlank @Size(max = 180) String storeName, @Size(max = 1000) String logoUrl,
            @Size(max = 1000) String faviconUrl, @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String primaryColor,
            @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String secondaryColor,
            @NotBlank @Pattern(regexp = "INR") String currency,
            @NotNull @DecimalMin("0.00") BigDecimal shippingFee,
            @NotNull @DecimalMin("0.00") BigDecimal freeShippingThreshold,
            @Min(5) @Max(1440) int sessionTimeoutMinutes, @NotNull Notifications notifications,
            @NotNull EmailRequest email) {}
    public record EmailRequest(@NotBlank @Size(max = 255) String smtpHost, @Min(1) @Max(65535) int smtpPort,
            @NotBlank @Size(max = 255) String smtpUsername, @Size(max = 255) String smtpPassword,
            @NotBlank @Email @Size(max = 320) String fromEmail, @NotBlank @Size(max = 180) String senderDisplayName,
            boolean tlsEnabled, boolean sslEnabled, boolean enabled) {}
    public record PasswordChangeRequest(@NotBlank String currentPassword,
            @NotBlank @Size(min = 12, max = 72) String newPassword) {}
    public record ConnectionResponse(String integration, boolean configured, String message) {}
    public record TestEmailRequest(@NotBlank @Email String recipient) {}
}
