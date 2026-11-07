package com.dreamspex.auth;


import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.auth.service.OtpDeliveryService;
import com.dreamspex.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistrationMailFailureIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @MockBean OtpDeliveryService otpDelivery;

    @Test
    void smtpFailureReturnsSanitizedErrorAndRollsBackRegistration() throws Exception {
        Role customer = roles.findByCode("CUSTOMER").orElseGet(() -> {
            Role role = new Role();
            role.setCode("CUSTOMER");
            role.setName("Customer");
            return roles.save(role);
        });
        doThrow(new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                "OTP_DELIVERY_FAILED", "The verification email could not be sent. Please try again later."))
                .when(otpDelivery).send(anyString(), anyString(), anyString(), anyString(), anyString());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"SMTP Failure Customer","email":"smtp-failure@example.com",
                                 "password":"SecurePassword123!"}
                                """))
                .andExpect(status().isBadGateway())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.code").value("OTP_DELIVERY_FAILED"))
                .andExpect(jsonPath("$.message").value(
                        "The verification email could not be sent. Please try again later."))
                .andExpect(jsonPath("$.requestId").isNotEmpty());

        org.junit.jupiter.api.Assertions.assertTrue(
                users.findByEmailIgnoreCaseAndDeletedAtIsNull("smtp-failure@example.com").isEmpty());
    }
}
