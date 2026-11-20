package com.dreamspex.auth.service;

public interface OtpDeliveryService {
    void send(String identifier, String channel, String purpose, String challengeId, String otp);

    default void sendPasswordResetLink(String identifier, String resetLink) {
        throw new UnsupportedOperationException("Password reset links are not supported by this delivery service.");
    }
}
