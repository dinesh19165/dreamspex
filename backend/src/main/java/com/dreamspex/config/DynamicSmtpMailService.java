package com.dreamspex.config;

import com.dreamspex.admin.AdminSettings;
import com.dreamspex.admin.AdminSettingsRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
public class DynamicSmtpMailService {
    private final AdminSettingsRepository settingsRepository;
    private final SmtpSecretCipher cipher;
    private final Environment environment;

    public DynamicSmtpMailService(AdminSettingsRepository settingsRepository, SmtpSecretCipher cipher, Environment environment) {
        this.settingsRepository = settingsRepository; this.cipher = cipher; this.environment = environment;
    }

    public void send(String recipient, String subject, String text, String html) {
        SmtpConfiguration configuration = configuration();
        if (!configuration.enabled()) throw new IllegalStateException("Email notifications are disabled.");
        try {
            JavaMailSenderImpl sender = sender(configuration);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());
            helper.setFrom(configuration.fromEmail(), configuration.senderName());
            helper.setTo(recipient); helper.setSubject(subject); helper.setText(text, html);
            sender.send(message);
        } catch (Exception exception) {
            if (exception instanceof IllegalStateException state) throw state;
            throw new IllegalStateException("SMTP delivery failed.", exception);
        }
    }

    public void testConnection() {
        JavaMailSenderImpl sender = sender(configuration());
        try { sender.testConnection(); }
        catch (Exception exception) { throw new IllegalStateException("SMTP connection failed.", exception); }
    }

    public SmtpConfiguration configuration() {
        AdminSettings saved = settingsRepository.findById("global").orElse(null);
        if (saved != null && saved.isSmtpConfigured()) {
            return new SmtpConfiguration(saved.getSmtpHost(), saved.getSmtpPort(), saved.getSmtpUsername(),
                    cipher.decrypt(saved.getSmtpPasswordEncrypted()), saved.getFromEmail(), saved.getSenderDisplayName(),
                    saved.isSmtpTlsEnabled(), saved.isSmtpSslEnabled(), saved.isEmailNotifications());
        }
        return new SmtpConfiguration(environment.getProperty("spring.mail.host", environment.getProperty("MAIL_HOST", "")),
                environment.getProperty("spring.mail.port", Integer.class, 587),
                environment.getProperty("spring.mail.username", environment.getProperty("MAIL_USERNAME", "")),
                environment.getProperty("MAIL_PASSWORD", ""), environment.getProperty("MAIL_FROM", ""),
                environment.getProperty("MAIL_FROM_NAME", "Dream Spex"), true, false, true);
    }

    private JavaMailSenderImpl sender(SmtpConfiguration configuration) {
        if (configuration.host().isBlank() || configuration.username().isBlank() || configuration.password().isBlank())
            throw new IllegalStateException("SMTP configuration is incomplete.");
        if (configuration.port() < 1 || configuration.port() > 65535)
            throw new IllegalStateException("SMTP port is invalid.");
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(configuration.host()); sender.setPort(configuration.port());
        sender.setUsername(configuration.username()); sender.setPassword(configuration.password());
        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", Boolean.toString(configuration.tlsEnabled()));
        properties.put("mail.smtp.ssl.enable", Boolean.toString(configuration.sslEnabled()));
        properties.put("mail.smtp.connectiontimeout", "10000"); properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        return sender;
    }

    public record SmtpConfiguration(String host, int port, String username, String password, String fromEmail,
                                     String senderName, boolean tlsEnabled, boolean sslEnabled, boolean enabled) {}
}
