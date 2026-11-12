package com.dreamspex.notification;

import java.util.Map;

public interface SmsGateway {
    String send(String phoneNumber, String templateId, Map<String, String> variables);
}
