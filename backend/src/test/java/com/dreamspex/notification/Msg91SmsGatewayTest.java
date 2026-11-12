package com.dreamspex.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestClient;

class Msg91SmsGatewayTest {
    @Test
    void sendsOnlyTheApprovedFlowTemplateAndItsVariables() {
        SmsProperties properties = new SmsProperties();
        properties.setMsg91AuthKey("test-auth-key");
        properties.setMsg91FlowUrl("https://msg91.test/flow");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://msg91.test/flow"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("authkey", "test-auth-key"))
                .andExpect(jsonPath("$.template_id").value("approved-flow"))
                .andExpect(jsonPath("$.recipients[0].mobiles").value("919876543210"))
                .andExpect(jsonPath("$.recipients[0].VAR1").value("DS-1"))
                .andRespond(withSuccess("{\"type\":\"success\",\"request_id\":\"msg-123\"}",
                        MediaType.APPLICATION_JSON));

        Msg91SmsGateway gateway = new Msg91SmsGateway(builder, properties);
        String messageId = gateway.send("+919876543210", "approved-flow", Map.of("VAR1", "DS-1"));

        assertEquals("msg-123", messageId);
        server.verify();
    }

    @Test
    void rejectsNonIndianNumbersWithoutContactingTheProvider() {
        SmsProperties properties = new SmsProperties();
        properties.setMsg91AuthKey("test-auth-key");
        Msg91SmsGateway gateway = new Msg91SmsGateway(RestClient.builder(), properties);

        assertThrows(SmsProviderException.class,
                () -> gateway.send("+14155550123", "approved-flow", Map.of("VAR1", "DS-1")));
    }

    @Test
    void localProfileAlwaysUsesTheMockProvider() {
        SmsProperties properties = new SmsProperties();
        properties.setProvider("msg91");
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");

        SmsGateway gateway = new SmsConfiguration().smsGateway(RestClient.builder(), properties, environment);

        assertInstanceOf(MockSmsGateway.class, gateway);
    }
}
