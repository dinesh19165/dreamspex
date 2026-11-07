package com.dreamspex.auth.service;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("test")
public class NoopOtpDeliveryService implements OtpDeliveryService {
    @Override
    public void send(String identifier, String channel, String purpose, String challengeId, String otp) {
        // Replace with an email/SMS provider adapter before enabling non-local profiles.
    }
}
