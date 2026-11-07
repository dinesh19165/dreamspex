package com.dreamspex.auth.service;

public interface OtpDeliveryService {
    void send(String identifier, String channel, String purpose, String challengeId, String otp);
}
