package com.dreamspex.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Arrays;
import java.util.Properties;

@Configuration
@Profile({"local", "staging", "prod", "production"})
public class GmailMailConfiguration {
    private static final Logger log = LoggerFactory.getLogger(GmailMailConfiguration.class);

    private final Environment environment;
    private final String host;
    private final int port;
    private final String username;
    private final String password;
    private final String from;

    public GmailMailConfiguration(
            Environment environment,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.port:587}") int port,
            @Value("${spring.mail.username:}") String username,
            @Value("${MAIL_PASSWORD:}") String password,
            @Value("${MAIL_FROM:}") String from) {
        this.environment = environment;
        this.host = host == null ? "" : host.trim();
        this.port = port;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : normalizeAppPassword(password);
        this.from = from == null ? "" : from.trim();
        if (port <= 0 || port > 65535) {
            throw new IllegalStateException("spring.mail.port must be a valid TCP port");
        }
    }

    @Bean
    JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties properties = mailSender.getJavaMailProperties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        logResolvedConfiguration(mailSender);
        return mailSender;
    }

    private void logResolvedConfiguration(JavaMailSenderImpl resolvedSender) {
        Properties properties = resolvedSender.getJavaMailProperties();
        boolean authEnabled = Boolean.parseBoolean(properties.getProperty("mail.smtp.auth"));
        boolean startTlsEnabled = Boolean.parseBoolean(properties.getProperty("mail.smtp.starttls.enable"));
        String[] activeProfiles = environment.getActiveProfiles();
        String profile = activeProfiles.length == 0
                ? "default:" + Arrays.toString(environment.getDefaultProfiles())
                : Arrays.toString(activeProfiles);
        log.info("SMTP configuration profile={} port={} hostConfigured={} usernameConfigured={} " +
                        "passwordConfigured={} senderConfigured={} smtpAuthEnabled={} startTlsEnabled={}",
                profile, resolvedSender.getPort(), hasText(resolvedSender.getHost()),
                hasText(resolvedSender.getUsername()), hasText(resolvedSender.getPassword()),
                hasText(from), authEnabled, startTlsEnabled);
    }

    static String normalizeAppPassword(String value) {
        return value.replaceAll("\\s+", "");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
