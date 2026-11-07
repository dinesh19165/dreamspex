package com.dreamspex.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GmailMailConfigurationTest {
    @Test
    void removesFormattingWhitespaceFromGmailAppPassword() {
        assertEquals("abcd efghijklmnop".replace(" ", ""),
                GmailMailConfiguration.normalizeAppPassword(" abcd efgh ijkl mnop "));
    }

    @Test
    void configuresJavaMailSenderFromResolvedGmailProperties() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");
        GmailMailConfiguration configuration = new GmailMailConfiguration(
                environment, "smtp.gmail.com", 587, "owner@gmail.com",
                "abcd efgh ijkl mnop", "owner@gmail.com");

        JavaMailSenderImpl sender = (JavaMailSenderImpl) configuration.javaMailSender();

        assertEquals("smtp.gmail.com", sender.getHost());
        assertEquals(587, sender.getPort());
        assertEquals("owner@gmail.com", sender.getUsername());
        assertEquals("abcdefghijklmnop", sender.getPassword());
        assertTrue(Boolean.parseBoolean(sender.getJavaMailProperties().getProperty("mail.smtp.auth")));
        assertTrue(Boolean.parseBoolean(sender.getJavaMailProperties()
                .getProperty("mail.smtp.starttls.enable")));
    }
}
