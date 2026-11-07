package com.dreamspex.auth.service;

import org.springframework.context.annotation.Profile;
import com.dreamspex.config.DynamicSmtpMailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Service;
import com.dreamspex.common.ApiException;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@Service
@Profile({"local", "staging", "prod", "production"})
public class GmailOtpDeliveryService implements OtpDeliveryService {
    private static final String EMAIL_CHANNEL = "EMAIL";
    private static final int EXPIRY_MINUTES = 10;

    private final DynamicSmtpMailService mailService;
    private final JavaMailSender legacyMailSender;
    private final String legacyFromAddress;
    private static final Logger log = LoggerFactory.getLogger(GmailOtpDeliveryService.class);

    @Autowired
    public GmailOtpDeliveryService(DynamicSmtpMailService mailService) {
        this.mailService = mailService; this.legacyMailSender = null; this.legacyFromAddress = null;
    }

    public GmailOtpDeliveryService(JavaMailSender mailSender, String fromAddress) {
        this.mailService = null; this.legacyMailSender = mailSender; this.legacyFromAddress = fromAddress;
    }

    @Override
    public void send(String identifier, String channel, String purpose, String challengeId, String otp) {
        if (!EMAIL_CHANNEL.equalsIgnoreCase(channel)) {
            throw new IllegalStateException("Gmail OTP delivery requires an email identifier");
        }
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("OTP email recipient is required");
        }

        try {
            if (legacyMailSender != null) {
                MimeMessage message = legacyMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());
                helper.setFrom(legacyFromAddress); helper.setTo(identifier); helper.setSubject(subjectFor(purpose));
                helper.setText(textBody(purpose, otp), htmlBody(purpose, otp)); legacyMailSender.send(message);
            } else {
                mailService.send(identifier, subjectFor(purpose), textBody(purpose, otp), htmlBody(purpose, otp));
            }
        } catch (MessagingException | RuntimeException exception) {
            log.error("OTP email delivery failed type={} rootCauseType={}",
                    exception.getClass().getName(), rootCause(exception).getClass().getName());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OTP_DELIVERY_FAILED",
                    "The verification email could not be sent. Please try again later.", exception);
        }
    }

    private Throwable rootCause(Throwable exception) {
        Throwable root = exception;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root;
    }

    private String subjectFor(String purpose) {
        return "Dream Spex verification code";
    }

    private String textBody(String purpose, String otp) {
        return """
                Hello,

                Your Dream Spex %s verification code is: %s

                This code expires in %d minutes and can be used only once.
                If you did not request this code, please secure your account and contact Dream Spex support.

                Dream Spex
                """.formatted(purposeLabel(purpose), otp, EXPIRY_MINUTES);
    }

    private String htmlBody(String purpose, String otp) {
        return """
                <div style="font-family:Arial,sans-serif;color:#24352b;line-height:1.6">
                  <h2 style="color:#1f5c43">Dream Spex</h2>
                  <p>Hello,</p>
                  <p>Your %s verification code is:</p>
                  <p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#1f5c43">%s</p>
                  <p>This code expires in <strong>%d minutes</strong> and can be used only once.</p>
                  <p style="color:#6b6258">If you did not request this code, please secure your account and contact Dream Spex support.</p>
                  <p>Dream Spex</p>
                </div>
                """.formatted(escapeHtml(purposeLabel(purpose)), escapeHtml(otp), EXPIRY_MINUTES);
    }

    private String purposeLabel(String purpose) {
        return "PASSWORD_RESET".equalsIgnoreCase(purpose)
                ? "password reset"
                : "account";
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
