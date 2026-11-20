package com.dreamspex.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.slf4j.LoggerFactory;

class Msg91OtpWidgetClientTest {
    private static final String API_URL = "https://api.msg91.com/api/v5/widget/verifyAccessToken";
    private static final String ACCOUNT_AUTHKEY = "test-account-authkey";

    @Test
    void verifiesWidgetAccessTokenUsingAccountAuthkeyAndDocumentedBody() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("authkey", ACCOUNT_AUTHKEY))
                .andExpect(content().json("""
                        {"access-token":"verified-access-token"}
                        """))
                .andRespond(withSuccess("{\"type\":\"success\",\"message\":\"+14155550123\"}",
                        MediaType.APPLICATION_JSON));

        assertEquals("+14155550123", client(builder).verifyAccessToken("verified-access-token"));
        server.verify();
    }

    @Test
    void rejectsInvalidOrExpiredWidgetAccessToken() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        "{\"type\":\"error\",\"message\":\"Invalid Captcha Token.\",\"status\":\"fail\"}",
                        MediaType.APPLICATION_JSON));

        Msg91OtpWidgetClient.InvalidAccessTokenException exception = assertThrows(
                Msg91OtpWidgetClient.InvalidAccessTokenException.class,
                () -> client(builder).verifyAccessToken("expired-or-invalid-token"));

        assertTrue(exception.getMessage().contains("invalid"));
        server.verify();
    }

    @Test
    void treatsProviderCode703AsAlreadyVerified() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        "{\"type\":\"error\",\"code\":703,\"message\":\"otp already verified\"}",
                        MediaType.APPLICATION_JSON));

        assertThrows(Msg91OtpWidgetClient.AlreadyVerifiedException.class,
                () -> client(builder).verifyAccessToken("verified-access-token"));
        server.verify();
    }

    @Test
    void treatsHttpErrorCode703AsAlreadyVerified() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("{\"type\":\"error\",\"code\":\"703\",\"message\":\"OTP already verified\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThrows(Msg91OtpWidgetClient.AlreadyVerifiedException.class,
                () -> client(builder).verifyAccessToken("verified-access-token"));
        server.verify();
    }

    @Test
    void treatsAlreadyVerifiedMessageWithoutProviderCodeAsAlreadyVerified() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        "{\"type\":\"error\",\"message\":\"OTP already verified\"}",
                        MediaType.APPLICATION_JSON));

        assertThrows(Msg91OtpWidgetClient.AlreadyVerifiedException.class,
                () -> client(builder).verifyAccessToken("verified-access-token"));
        server.verify();
    }

    @Test
    void reportsProviderAuthenticationFailureAndLogsOnlyMaskedConfiguration() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("authkey", ACCOUNT_AUTHKEY))
                .andRespond(withSuccess(
                        "{\"message\":\"AuthenticationFailure\",\"type\":\"error\",\"code\":\"201\"}",
                        MediaType.APPLICATION_JSON));
        Logger logger = (Logger) LoggerFactory.getLogger(Msg91OtpWidgetClient.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        SmsProperties properties = new SmsProperties();
        properties.setMsg91AuthKey(ACCOUNT_AUTHKEY);
        properties.setMsg91WidgetId("test-widget-id");

        try {
            Msg91OtpWidgetClient.AuthenticationFailureException exception = assertThrows(
                    Msg91OtpWidgetClient.AuthenticationFailureException.class,
                    () -> new Msg91OtpWidgetClient(builder, properties).verifyAccessToken("access-token"));
            assertTrue(exception.getMessage().contains("AuthKey/WidgetId"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        String diagnostic = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .filter(message -> message.contains("verify configuration"))
                .findFirst()
                .orElseThrow();
        assertTrue(diagnostic.contains(API_URL));
        assertTrue(diagnostic.contains("authkey=[REDACTED]"));
        assertTrue(diagnostic.contains("widgetId=test-widget-id"));
        assertTrue(diagnostic.contains("authKeyLength=" + ACCOUNT_AUTHKEY.length()));
        assertTrue(!diagnostic.contains(ACCOUNT_AUTHKEY));
        server.verify();
    }

    @Test
    void logsProviderStatusAndSafeErrorDetailsWithoutSecretsOrPhoneNumber() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .body("""
                                {"type":"error","message":"Invalid Captcha Token.",
                                 "access-token":"verified-access-token",
                                 "authkey":"test-account-authkey","mobile":"+14155550123"}
                                """)
                        .contentType(MediaType.APPLICATION_JSON));
        Logger logger = (Logger) LoggerFactory.getLogger(Msg91OtpWidgetClient.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            assertThrows(Msg91OtpWidgetClient.ProviderException.class,
                    () -> client(builder).verifyAccessToken("verified-access-token"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        String diagnostic = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .filter(message -> message.contains("request failed"))
                .findFirst()
                .orElseThrow();
        assertTrue(diagnostic.contains("status=400"));
        assertTrue(diagnostic.contains("Invalid Captcha Token."));
        assertTrue(diagnostic.contains("requestId="));
        assertTrue(!diagnostic.contains("verified-access-token"));
        assertTrue(!diagnostic.contains(ACCOUNT_AUTHKEY));
        assertTrue(!diagnostic.contains("+14155550123"));
        server.verify();
    }

    @Test
    void rejectsMissingAccountAuthkeyBeforeCallingProvider() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();

        Msg91OtpWidgetClient.ProviderException exception = assertThrows(
                Msg91OtpWidgetClient.ProviderException.class,
                () -> new Msg91OtpWidgetClient(builder, new SmsProperties())
                        .verifyAccessToken("verified-access-token"));

        assertTrue(exception.getMessage().contains("Authkey"));
        server.verify();
    }

    @Test
    void reportsProviderFailureWithoutIncludingAccessTokenOrAuthkey() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("authkey", ACCOUNT_AUTHKEY))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("request failed")
                        .contentType(MediaType.TEXT_PLAIN));

        Msg91OtpWidgetClient.ProviderException exception = assertThrows(
                Msg91OtpWidgetClient.ProviderException.class,
                () -> client(builder).verifyAccessToken("verified-access-token"));

        assertTrue(!exception.getMessage().contains(ACCOUNT_AUTHKEY));
        assertTrue(!exception.getMessage().contains("verified-access-token"));
        server.verify();
    }

    private Msg91OtpWidgetClient client(RestClient.Builder builder) {
        SmsProperties properties = new SmsProperties();
        properties.setMsg91AuthKey(ACCOUNT_AUTHKEY);
        return new Msg91OtpWidgetClient(builder, properties);
    }
}
