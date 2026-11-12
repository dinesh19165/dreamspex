package com.dreamspex.notification;

import java.util.Map;
import java.util.UUID;

public class MockSmsGateway implements SmsGateway {
    @Override
    public String send(String phoneNumber, String templateId, Map<String, String> variables) {
        return "mock-" + UUID.randomUUID();
    }
}
