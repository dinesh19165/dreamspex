package com.dreamspex.order;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderAccessIntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test
    void customerCannotAccessAdminOrdersOrPayments() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/orders").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/payments").with(customer)).andExpect(status().isForbidden());
    }

    @Test
    void paymentWebhookDoesNotRequireCustomerJwt() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                "/api/v1/payments/webhooks/razorpay")
                .header("X-Razorpay-Signature", "invalid")
                .header("X-Razorpay-Event-Id", "event-1")
                .content("{}")
                .contentType("application/json"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deliveryBatchAdminApiIsSuperAdminOnlyAndBatchLinkIsPublicCapability() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/delivery/batches").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/delivery/batches/not-a-valid-token")).andExpect(status().isNotFound());
    }
}
