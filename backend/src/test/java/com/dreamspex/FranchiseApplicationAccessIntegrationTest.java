package com.dreamspex;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FranchiseApplicationAccessIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void visitorsCanSubmitAndOnlySuperAdminsCanReviewApplications() throws Exception {
        String request = """
                {
                  "fullName":"Asha Rao",
                  "mobileNumber":"9876543210",
                  "email":"asha-franchise@example.com",
                  "preferredCity":"Hyderabad",
                  "state":"Telangana",
                  "fullAddress":"12 Main Road, Hyderabad",
                  "investmentBudget":750000,
                  "preferredStoreFormat":"BOUTIQUE",
                  "additionalMessage":"Interested in a boutique location"
                }
                """;
        MvcResult createdResult = mockMvc.perform(post("/api/v1/franchise-applications")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.referenceId").isNotEmpty())
                .andReturn();
        String referenceId = objectMapper.readTree(createdResult.getResponse().getContentAsByteArray())
                .get("referenceId").asText();

        mockMvc.perform(get("/api/v1/admin/franchise-applications"))
                .andExpect(status().isUnauthorized());
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/franchise-applications").with(customer))
                .andExpect(status().isForbidden());

        var admin = authentication(new UsernamePasswordAuthenticationToken("super-admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
        MvcResult listResult = mockMvc.perform(get("/api/v1/admin/franchise-applications").with(admin))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode applications = objectMapper.readTree(listResult.getResponse().getContentAsByteArray());
        String applicationId = null;
        for (JsonNode application : applications) {
            if (referenceId.equals(application.path("referenceId").asText())) {
                applicationId = application.path("id").asText();
                break;
            }
        }
        org.junit.jupiter.api.Assertions.assertNotNull(applicationId);

        mockMvc.perform(patch("/api/v1/admin/franchise-applications/{id}", applicationId).with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONTACTED\",\"internalNote\":\"Called\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/admin/franchise-applications/{id}", applicationId).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONTACTED\",\"internalNote\":\"Called applicant\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONTACTED"))
                .andExpect(jsonPath("$.internalNotes").value(org.hamcrest.Matchers.containsString("Called applicant")));
    }

    @Test
    void publicSubmissionValidatesRequiredFields() throws Exception {
        mockMvc.perform(post("/api/v1/franchise-applications")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnprocessableEntity());
    }
}
