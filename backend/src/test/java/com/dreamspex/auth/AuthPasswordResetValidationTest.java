package com.dreamspex.auth;


import com.dreamspex.auth.entity.OtpChallenge;
import com.dreamspex.auth.entity.RefreshToken;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.OtpChallengeRepository;
import com.dreamspex.auth.repository.RefreshTokenRepository;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.dreamspex.config.SecurityProperties;
import jakarta.persistence.EntityManager;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthPasswordResetValidationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired OtpChallengeRepository challenges;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired SecurityProperties securityProperties;
    @Autowired EntityManager entityManager;

    @Test
    void resetPasswordRequiresChallengeIdOtpAndNewPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"","otp":"","newPassword":""}
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void forgotPasswordReturnsGenericAcceptedResponseWithOpaqueChallengeId() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"unknown@example.com"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true))
                .andExpect(jsonPath("$.challengeId").isNotEmpty());
    }

    @Test
    void resetPasswordRejectsUnknownChallengeId() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"unknown-challenge","otp":"123456",
                                 "newPassword":"NewSecurePassword123!"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CHALLENGE"));
    }

    @Test
    void resendOtpReturnsTheSameGenericResponseForUnknownAndUnavailableChallenges() throws Exception {
        mockMvc.perform(post("/api/v1/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"unknown-challenge"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true));

        User user = createUser();
        OtpChallenge challenge = createChallenge(user, Instant.now().plus(10, ChronoUnit.MINUTES), "123456");
        challenge.setLastSentAt(Instant.now());

        mockMvc.perform(post("/api/v1/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"%s"}
                                """.formatted(challenge.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true));
    }

    @Test
    void resetPasswordChangesPasswordAndRevokesRefreshTokens() throws Exception {
        User user = createUser();
        OtpChallenge challenge = createChallenge(user, Instant.now().plus(10, ChronoUnit.MINUTES), "123456");
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash("existing-refresh-token-hash-" + user.getId());
        refreshToken.setFamilyId("family-" + user.getId());
        refreshToken.setExpiresAt(Instant.now().plus(10, ChronoUnit.DAYS));
        refreshTokens.save(refreshToken);

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"%s","otp":"123456",
                                 "newPassword":"NewSecurePassword123!"}
                                """.formatted(challenge.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reset").value(true))
                .andExpect(jsonPath("$.accepted").value(true));

        entityManager.clear();
        User updated = users.findById(user.getId()).orElseThrow();
        RefreshToken revoked = refreshTokens.findById(refreshToken.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("NewSecurePassword123!", updated.getPasswordHash()));
        assertTrue(revoked.getRevokedAt() != null);
        assertTrue(challenges.findById(challenge.getId()).orElseThrow().getVerifiedAt() != null);
    }

    @Test
    void resetPasswordRejectsInvalidOtpWithoutChangingPassword() throws Exception {
        User user = createUser();
        OtpChallenge challenge = createChallenge(user, Instant.now().plus(10, ChronoUnit.MINUTES), "123456");
        String oldPasswordHash = user.getPasswordHash();

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"%s","otp":"654321",
                                 "newPassword":"NewSecurePassword123!"}
                                """.formatted(challenge.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CHALLENGE"));

        entityManager.clear();
        assertTrue(users.findById(user.getId()).orElseThrow().getPasswordHash().equals(oldPasswordHash));
        assertTrue(challenges.findById(challenge.getId()).orElseThrow().getAttempts() == 1);
    }

    @Test
    void resetPasswordRejectsExpiredOtp() throws Exception {
        User user = createUser();
        OtpChallenge challenge = createChallenge(user, Instant.now().minus(1, ChronoUnit.MINUTES), "123456");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"%s","otp":"123456",
                                 "newPassword":"NewSecurePassword123!"}
                                """.formatted(challenge.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CHALLENGE"));
    }

    @Test
    void resetPasswordRejectsPasswordsBeyondBcryptByteLimitBeforeConsumingOtp() throws Exception {
        User user = createUser();
        OtpChallenge challenge = createChallenge(user, Instant.now().plus(10, ChronoUnit.MINUTES), "123456");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"challengeId":"%s","otp":"123456",
                                 "newPassword":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
                                """.formatted(challenge.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'newPassword')]").isNotEmpty());

        assertTrue(challenges.findById(challenge.getId()).orElseThrow().getVerifiedAt() == null);
    }

    private User createUser() {
        Role role = roles.findByCode("CUSTOMER").orElseGet(() -> {
            Role customer = new Role();
            customer.setCode("CUSTOMER");
            customer.setName("Customer");
            return roles.save(customer);
        });
        User user = new User();
        user.setEmail("reset-" + System.nanoTime() + "@example.com");
        user.setDisplayName("Reset Customer");
        user.setPasswordHash(passwordEncoder.encode("OldSecurePassword123!"));
        user.setStatus("ACTIVE");
        user.getRoles().add(role);
        return users.save(user);
    }

    private OtpChallenge createChallenge(User user, Instant expiresAt, String otp) {
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(user.getEmail());
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("EMAIL");
        challenge.setCodeHash(hashOtp(otp));
        challenge.setExpiresAt(expiresAt);
        return challenges.save(challenge);
    }

    private String hashOtp(String otp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(securityProperties.otpSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
