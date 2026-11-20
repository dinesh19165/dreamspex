package com.dreamspex.auth.service;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("test")
public class NoopOtpDeliveryService implements OtpDeliveryService {
    @Override
    public void send(String identifier, String channel, String purpose, String challengeId, String otp) {
        // Test profile intentionally discards OTP delivery.
    }

    @Override
    public void sendPasswordResetLink(String identifier, String resetLink) {
        // Test profile intentionally discards reset-link delivery.
    }
}
