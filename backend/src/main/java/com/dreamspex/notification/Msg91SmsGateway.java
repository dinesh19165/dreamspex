package com.dreamspex.notification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import com.fasterxml.jackson.databind.JsonNode;

public class Msg91SmsGateway implements SmsGateway {
    private final RestClient client;
    private final String authKey;
    private final String flowUrl;

    public Msg91SmsGateway(RestClient.Builder builder, SmsProperties properties) {
        this.client = builder.build();
        this.authKey = properties.getMsg91AuthKey();
        this.flowUrl = properties.getMsg91FlowUrl();
        if (authKey == null || authKey.isBlank()) {
            throw new IllegalStateException("DREAMSPEX_SMS_MSG91_AUTH_KEY is required when MSG91 SMS is enabled.");
        }
    }

    @Override
    public String send(String phoneNumber, String templateId, Map<String, String> variables) {
        if (templateId == null || templateId.isBlank()) {
            throw new SmsProviderException("The approved MSG91 DLT flow template is not configured.", false);
        }
        if (phoneNumber == null || !phoneNumber.startsWith("+91")) {
            throw new SmsProviderException("MSG91 SMS is configured for verified Indian mobile numbers only.", false);
        }

        Map<String, String> recipient = new LinkedHashMap<>();
        recipient.put("mobiles", phoneNumber.substring(1));
        variables.forEach(recipient::put);
        Map<String, Object> body = Map.of("template_id", templateId, "recipients", List.of(recipient));

        try {
            JsonNode response = client.post()
                    .uri(flowUrl)
                    .header("authkey", authKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || "error".equalsIgnoreCase(response.path("type").asText())) {
                throw new SmsProviderException("MSG91 rejected the SMS request.", false);
            }
            String messageId = response.path("request_id").asText(null);
            if (messageId == null || messageId.isBlank()) {
                messageId = response.path("message_id").asText(null);
            }
            if (messageId == null || messageId.isBlank()) {
                throw new SmsProviderException("MSG91 did not return a message identifier.", true);
            }
            return messageId;
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            throw new SmsProviderException("MSG91 request failed with HTTP " + status + ".",
                    status == 408 || status == 429 || status >= 500, exception);
        } catch (RestClientException exception) {
            throw new SmsProviderException("MSG91 could not be reached.", true, exception);
        }
    }
}
