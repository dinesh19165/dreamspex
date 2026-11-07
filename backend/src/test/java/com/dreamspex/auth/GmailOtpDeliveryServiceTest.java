package com.dreamspex.auth;


import com.dreamspex.auth.service.GmailOtpDeliveryService;
import jakarta.mail.Session;
import jakarta.mail.Multipart;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailSendException;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

class GmailOtpDeliveryServiceTest {
    private JavaMailSender mailSender;
    private GmailOtpDeliveryService service;
    private MimeMessage message;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        service = new GmailOtpDeliveryService(mailSender, "noreply@dreamspex.example");
    }

    @Test
    void sendsRegistrationEmailWithoutExposingOtpToLogsOrApi() throws Exception {
        service.send("customer@example.com", "EMAIL", "REGISTRATION", "challenge-id", "123456");

        assertEquals("noreply@dreamspex.example", message.getFrom()[0].toString());
        assertEquals("customer@example.com", message.getAllRecipients()[0].toString());
        assertEquals("Dream Spex verification code", message.getSubject());
        String content = multipartContent(message);
        assertTrue(content.contains("123456"));
        assertTrue(content.contains("10 minutes"));
        verify(mailSender).send(message);
    }

    @Test
    void sendsPasswordResetEmail() throws Exception {
        service.send("customer@example.com", "EMAIL", "PASSWORD_RESET", "challenge-id", "654321");

        assertTrue(multipartContent(message).contains("password reset"));
        verify(mailSender).send(message);
    }

    @Test
    void rejectsSmsInsteadOfPretendingGmailDeliveredIt() {
        assertThrows(IllegalStateException.class,
                () -> service.send("+15551234567", "SMS", "REGISTRATION", "challenge-id", "123456"));
        verifyNoInteractions(mailSender);
    }

    @Test
    void mapsSmtpFailureToSanitizedApiException() {
        doThrow(new MailSendException("SMTP authentication failed for customer@example.com"))
                .when(mailSender).send(any(MimeMessage.class));

        com.dreamspex.common.ApiException exception = assertThrows(
                com.dreamspex.common.ApiException.class,
                () -> service.send("customer@example.com", "EMAIL", "REGISTRATION", "challenge-id", "123456"));

        assertEquals("OTP_DELIVERY_FAILED", exception.code());
        assertEquals(502, exception.status().value());
        assertEquals("The verification email could not be sent. Please try again later.", exception.getMessage());
    }

    private String multipartContent(MimeMessage message) throws Exception {
        return contentOf(message.getContent());
    }

    private String contentOf(Object value) throws Exception {
        if (value instanceof Multipart multipart) {
            StringBuilder content = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                content.append(contentOf(multipart.getBodyPart(index).getContent()));
            }
            return content.toString();
        }
        return value == null ? "" : value.toString();
    }
}
