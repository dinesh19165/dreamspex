package com.dreamspex.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.dreamspex.common.RequestIdFilter;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

public class Msg91OtpWidgetClient {
    private static final String API_BASE = "https://api.msg91.com/api/v5/widget/";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(Msg91OtpWidgetClient.class);
    private static final Pattern PHONE_NUMBER = Pattern.compile("(?<!\\d)\\+?\\d(?:[\\s().-]*\\d){7,14}(?!\\d)");

    private final RestClient client;
    private final SmsProperties properties;

    public Msg91OtpWidgetClient(RestClient.Builder builder, SmsProperties properties) {
        this.client = builder.build();
        this.properties = properties;
    }

    public String verifyAccessToken(String accessToken) {
        requireAccountAuthkey();
        JsonNode response = post("verifyAccessToken", Map.of("access-token", accessToken), true);
        if (isOtpAlreadyVerified(response)) {
            throw new AlreadyVerifiedException();
        }
        if (!isSuccess(response)) {
            throw new InvalidAccessTokenException();
        }
        return requiredMessage(response, "MSG91 did not return the verified identifier.");
    }

    private JsonNode post(String endpoint, Map<String, String> body, boolean useAccountAuthkey) {
        String correlationId = correlationId();
        log.info("MSG91 OTP Widget request initiated operation={} requestId={}", endpoint, correlationId);
        try {
            String url = API_BASE + endpoint;
            String authKey = properties.getMsg91AuthKey();
            if ("verifyAccessToken".equals(endpoint)) {
                log.info("MSG91 OTP Widget verify configuration url={} headers={{authkey=[REDACTED], content-type=application/json, accept=application/json}} widgetId={} authKeyLength={} requestId={}",
                        url, properties.getMsg91WidgetId(), authKey == null ? 0 : authKey.length(), correlationId);
            }
            RestClient.RequestBodySpec request = client.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON);
            if (useAccountAuthkey) {
                request.header("authkey", authKey);
            }
            ResponseEntity<JsonNode> response = request.body(body).retrieve().toEntity(JsonNode.class);
            JsonNode responseBody = response.getBody();
            if (isSuccess(responseBody)) {
                log.info("MSG91 OTP Widget request completed operation={} status={} requestId={}",
                        endpoint, response.getStatusCode().value(), correlationId);
            } else {
                log.warn("MSG91 OTP Widget returned an error operation={} status={} requestId={} response={}",
                        endpoint, response.getStatusCode().value(), correlationId,
                        safeErrorResponse(responseBody == null ? null : responseBody.toString(), body));
            }
            if (isAuthenticationFailure(responseBody)) {
                throw new AuthenticationFailureException();
            }
            return responseBody;
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            JsonNode errorResponse = parseResponse(exception.getResponseBodyAsString());
            log.warn("MSG91 OTP Widget request failed operation={} status={} requestId={} response={}",
                    endpoint, status, correlationId,
                    safeErrorResponse(exception.getResponseBodyAsString(), body));
            if (isOtpAlreadyVerified(errorResponse)) {
                return errorResponse;
            }
            if (isAuthenticationFailure(errorResponse)) {
                throw new AuthenticationFailureException();
            }
            throw new ProviderException("MSG91 OTP Widget request failed with HTTP " + status + ".");
        } catch (RestClientException exception) {
            log.warn("MSG91 OTP Widget request failed operation={} exceptionType={} requestId={}",
                    endpoint, exception.getClass().getSimpleName(), correlationId);
            throw new ProviderException("MSG91 OTP Widget is unavailable.");
        }
    }

    private String safeErrorResponse(String response, Map<String, String> requestBody) {
        if (response == null || response.isBlank()) {
            return "<empty>";
        }
        String sanitized = response;
        for (String value : requestBody.values()) {
            if (!isBlank(value)) {
                sanitized = sanitized.replace(value, "[REDACTED]");
            }
        }
        if (!isBlank(properties.getMsg91AuthKey())) {
            sanitized = sanitized.replace(properties.getMsg91AuthKey(), "[REDACTED]");
        }
        if (!isBlank(properties.getMsg91WidgetAuthToken())) {
            sanitized = sanitized.replace(properties.getMsg91WidgetAuthToken(), "[REDACTED]");
        }
        sanitized = PHONE_NUMBER.matcher(sanitized).replaceAll("[REDACTED_PHONE]");
        return sanitized.length() <= 512 ? sanitized : sanitized.substring(0, 512);
    }

    private String correlationId() {
        String requestId = MDC.get(RequestIdFilter.REQUEST_ID);
        return isBlank(requestId) ? UUID.randomUUID().toString() : requestId;
    }

    private void requireAccountAuthkey() {
        if (isBlank(properties.getMsg91AuthKey())) {
            throw new ProviderException("MSG91 account Authkey is not configured.");
        }
    }

    private boolean isSuccess(JsonNode response) {
        return response != null && "success".equalsIgnoreCase(response.path("type").asText());
    }

    private boolean isOtpAlreadyVerified(JsonNode response) {
        if (response == null) {
            return false;
        }
        return "703".equals(response.path("code").asText())
                || response.path("message").asText().matches("(?is).*already\\s+verified.*");
    }

    private boolean isAuthenticationFailure(JsonNode response) {
        return response != null
                && ("201".equals(response.path("code").asText())
                || "AuthenticationFailure".equalsIgnoreCase(response.path("message").asText()));
    }

    private JsonNode parseResponse(String response) {
        if (response == null || response.isBlank()) {
            return null;
        }
        try {
            return JSON.readTree(response);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            return null;
        }
    }

    private String requiredMessage(JsonNode response, String errorMessage) {
        String message = response == null ? null : response.path("message").asText(null);
        if (isBlank(message)) {
            throw new ProviderException(errorMessage);
        }
        return message;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static final class InvalidAccessTokenException extends RuntimeException {
        public InvalidAccessTokenException() {
            super("The MSG91 OTP access token is invalid.");
        }
    }

    public static final class AlreadyVerifiedException extends RuntimeException {
        public AlreadyVerifiedException() {
            super("MSG91 reports that this OTP was already verified.");
        }
    }

    public static final class AuthenticationFailureException extends RuntimeException {
        public AuthenticationFailureException() {
            super("MSG91 Authentication Failed - Check AuthKey/WidgetId in backend config.");
        }
    }

    public static final class ProviderException extends RuntimeException {
        public ProviderException(String message) {
            super(message);
        }
    }
}
