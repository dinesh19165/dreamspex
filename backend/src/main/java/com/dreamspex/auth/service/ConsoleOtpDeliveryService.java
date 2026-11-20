package com.dreamspex.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("none")
public class ConsoleOtpDeliveryService implements OtpDeliveryService {
    private static final Logger log = LoggerFactory.getLogger(ConsoleOtpDeliveryService.class);

    @Override
    public void send(String identifier, String channel, String purpose, String challengeId, String otp) {
        log.info("OTP delivery fallback: identifier={} channel={} purpose={} challengeId={} otp={}",
                identifier, channel, purpose, challengeId, otp);
    }

    @Override
    public void sendPasswordResetLink(String identifier, String resetLink) {
        log.info("Password reset link delivery fallback: identifier={} resetLink={}", identifier, resetLink);
    }
}
