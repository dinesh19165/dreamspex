package com.dreamspex;

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
class Phase3AccessIntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test
    void membershipPlansArePublic() throws Exception {
        mockMvc.perform(get("/api/v1/membership-plans")).andExpect(status().isOk());
    }

    @Test
    void customerCannotReviewPrescriptionsOrManagePlans() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/prescriptions").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/membership-plans").with(customer)).andExpect(status().isForbidden());
    }
}
