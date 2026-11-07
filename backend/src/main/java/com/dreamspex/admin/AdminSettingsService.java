package com.dreamspex.admin;


import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.common.ApiException;
import com.dreamspex.payment.PaymentProperties;
import com.dreamspex.config.DynamicSmtpMailService;
import com.dreamspex.config.SmtpSecretCipher;
import com.dreamspex.security.CurrentUser;
import jakarta.transaction.Transactional;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.Instant;
import static com.dreamspex.admin.AdminSettingsDtos.*;

@Service
public class AdminSettingsService {
    private final AdminSettingsRepository repository;
    private final CurrentUser current;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService audit;
    private final PaymentProperties payment;
    private final Environment environment;
    private final SmtpSecretCipher cipher;
    private final DynamicSmtpMailService mailService;

    public AdminSettingsService(AdminSettingsRepository repository, CurrentUser current, UserRepository users,
            PasswordEncoder passwordEncoder, AuditLogService audit, PaymentProperties payment, Environment environment,
            SmtpSecretCipher cipher, DynamicSmtpMailService mailService) {
        this.repository = repository; this.current = current; this.users = users; this.passwordEncoder = passwordEncoder;
        this.audit = audit; this.payment = payment; this.environment = environment;
        this.cipher = cipher; this.mailService = mailService;
    }

    @Transactional
    public SettingsResponse get(org.springframework.security.core.Authentication authentication) {
        User actor = current.require(authentication);
        return response(repository.findById("global").orElseGet(() -> repository.save(new AdminSettings())), actor);
    }

    @Transactional
    public SettingsResponse save(org.springframework.security.core.Authentication authentication, SettingsRequest request) {
        User actor = current.require(authentication);
        AdminSettings settings = repository.findById("global").orElseGet(AdminSettings::new);
        settings.setStoreName(request.storeName().trim()); settings.setLogoUrl(blankToNull(request.logoUrl()));
        settings.setFaviconUrl(blankToNull(request.faviconUrl())); settings.setPrimaryColor(request.primaryColor());
        settings.setSecondaryColor(request.secondaryColor()); settings.setCurrency(request.currency());
        settings.setShippingFee(request.shippingFee()); settings.setFreeShippingThreshold(request.freeShippingThreshold());
        settings.setSessionTimeoutMinutes(request.sessionTimeoutMinutes());
        settings.setEmailNotifications(request.notifications().emailNotifications());
        settings.setOrderConfirmationAlerts(request.notifications().orderConfirmationAlerts());
        settings.setPaymentAlerts(request.notifications().paymentAlerts());
        settings.setNewCustomerAlerts(request.notifications().newCustomerAlerts());
        settings.setLowStockAlerts(request.notifications().lowStockAlerts());
        var email = request.email();
        settings.setSmtpHost(email.smtpHost().trim()); settings.setSmtpPort(email.smtpPort());
        settings.setSmtpUsername(email.smtpUsername().trim()); settings.setFromEmail(email.fromEmail().trim());
        settings.setSenderDisplayName(email.senderDisplayName().trim()); settings.setSmtpTlsEnabled(email.tlsEnabled());
        settings.setSmtpSslEnabled(email.sslEnabled()); settings.setEmailNotifications(email.enabled());
        if (email.smtpPassword() != null && !email.smtpPassword().isBlank())
            settings.setSmtpPasswordEncrypted(cipher.encrypt(email.smtpPassword()));
        settings.setUpdatedAt(Instant.now()); repository.save(settings);
        audit.record(actor, "ADMIN_SETTINGS_UPDATED", "ADMIN_SETTINGS", "global");
        return response(settings, actor);
    }

    @Transactional
    public void changePassword(org.springframework.security.core.Authentication authentication, PasswordChangeRequest request) {
        User actor = current.require(authentication);
        if (!passwordEncoder.matches(request.currentPassword(), actor.getPasswordHash()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
        if (passwordEncoder.matches(request.newPassword(), actor.getPasswordHash()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PASSWORD_UNCHANGED", "Choose a different password.");
        actor.setPasswordHash(passwordEncoder.encode(request.newPassword())); actor.incrementTokenVersion(); users.save(actor);
        audit.record(actor, "ADMIN_PASSWORD_CHANGED", "USER", actor.getId());
    }

    public ConnectionResponse test(String integration) {
        return switch (integration.toLowerCase()) {
            case "razorpay" -> new ConnectionResponse("razorpay", hasText(payment.keyId()) && hasText(payment.keySecret()), "Uses configured Razorpay test credentials.");
            case "smtp" -> new ConnectionResponse("smtp", mailService.configuration().enabled() && hasText(mailService.configuration().host()) && hasText(mailService.configuration().username()) && hasText(mailService.configuration().password()), "Uses saved SMTP configuration or environment fallback.");
            case "sms", "whatsapp" -> new ConnectionResponse(integration.toLowerCase(), false, "No provider is configured.");
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INTEGRATION", "Unknown integration.");
        };
    }

    public ConnectionResponse testSmtp() {
        try { mailService.testConnection(); return new ConnectionResponse("smtp", true, "SMTP connection succeeded."); }
        catch (RuntimeException exception) { return new ConnectionResponse("smtp", false, "SMTP connection failed."); }
    }

    public void sendTestEmail(String recipient) {
        mailService.send(recipient, "Dream Spex SMTP test", "This is a Dream Spex SMTP test email.", "<p>This is a Dream Spex SMTP test email.</p>");
    }

    private SettingsResponse response(AdminSettings settings, User actor) {
        return new SettingsResponse(settings.getStoreName(), settings.getLogoUrl(), settings.getFaviconUrl(), settings.getPrimaryColor(),
            settings.getSecondaryColor(), settings.getCurrency(), settings.getShippingFee(), settings.getFreeShippingThreshold(),
            settings.getSessionTimeoutMinutes(), new Notifications(settings.isEmailNotifications(), settings.isOrderConfirmationAlerts(),
            settings.isPaymentAlerts(), settings.isNewCustomerAlerts(), settings.isLowStockAlerts()),
            new SecurityProfile(actor.getDisplayName(), actor.getEmail(), "Minimum 12 characters; never reuse an old password."),
            new Integrations(test("razorpay").configured(), test("smtp").configured(), false, false),
            new EmailConfiguration(settings.getSmtpHost(), settings.getSmtpPort(), settings.getSmtpUsername(),
                settings.getSmtpPasswordEncrypted() != null, settings.getFromEmail(), settings.getSenderDisplayName(),
                settings.isSmtpTlsEnabled(), settings.isSmtpSslEnabled(), settings.isEmailNotifications()));
    }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static boolean hasText(String value) { return value != null && !value.isBlank(); }
}
