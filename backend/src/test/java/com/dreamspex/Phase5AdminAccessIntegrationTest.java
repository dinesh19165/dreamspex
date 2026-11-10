package com.dreamspex;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase5AdminAccessIntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test
    void customerCannotAccessPhase5AdminOperations() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/dashboard").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/customers").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/audit-logs").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/gst/settings").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/gst/history").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/v1/admin/gst/settings").with(customer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"defaultRate":18,"priceTreatment":"INCLUSIVE","enabled":true}
                        """)).andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                        "/api/v1/admin/products/{id}/gst", "product-id").with(customer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"hsnCode":"9004","useGlobalRate":true,"gstEnabled":true}
                        """)).andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessPhase5AdminOperations() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/gst/settings")).andExpect(status().isUnauthorized());
    }

    @Test
    void storeDeliveryConfigurationIsSuperAdminOnlyAndValidatesRadiusAndCoordinates() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/stores").with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/stores/all").with(customer)).andExpect(status().isForbidden());

        var admin = authentication(new UsernamePasswordAuthenticationToken("super-admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
        String invalidStore = """
                {"name":"Test Store","phone":"","address":"1 Main Street","city":"Hyderabad",
                 "state":"Telangana","postalCode":"500001","latitude":91,"longitude":78.4,
                 "deliveryRadiusKm":50,"status":"ACTIVE"}
                """;
        mockMvc.perform(post("/api/v1/admin/stores").with(admin).contentType(MediaType.APPLICATION_JSON)
                        .content(invalidStore))
                .andExpect(status().isUnprocessableEntity());

        String validStore = """
                {"name":"Test Store","phone":"","address":"1 Main Street","city":"Hyderabad",
                 "state":"Telangana","postalCode":"500001","latitude":17.385,"longitude":78.4867,
                 "deliveryRadiusKm":50,"status":"ACTIVE"}
                """;
        var created = mockMvc.perform(post("/api/v1/admin/stores").with(admin)
                        .contentType(MediaType.APPLICATION_JSON).content(validStore))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.deliveryRadiusKm").value(50.0))
                .andReturn();
        String storeId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                .readTree(created.getResponse().getContentAsByteArray()).get("id").asText();
        mockMvc.perform(patch("/api/v1/admin/stores/{id}", storeId).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validStore.replace("\"deliveryRadiusKm\":50", "\"deliveryRadiusKm\":200")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryRadiusKm").value(200.0));
    }

    @Test
    void deliveryOtpRegenerationRemainsRestrictedToSuperAdmins() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        String path = "/api/v1/admin/delivery/batches/batch-id/orders/order-id/otp";

        mockMvc.perform(post(path).with(customer).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnDeliveryBatchOperationsRemainRestrictedToSuperAdmins() throws Exception {
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        String path = "/api/v1/admin/returns/delivery-batches/RETURN_PICKUP";

        mockMvc.perform(get(path).with(customer)).andExpect(status().isForbidden());
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @Test
    void cmsImageUploadRemainsRestrictedToSuperAdmins() throws Exception {
        var image = new MockMultipartFile("file", "banner.jpg", "image/jpeg", new byte[]{1, 2, 3});
        var customer = authentication(new UsernamePasswordAuthenticationToken("customer", null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));

        mockMvc.perform(multipart("/api/v1/admin/cms/images").file(image).with(customer))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/v1/admin/cms/images").file(image))
                .andExpect(status().isUnauthorized());
    }
}
