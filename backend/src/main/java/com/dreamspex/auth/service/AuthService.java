package com.dreamspex.auth.service;


import com.dreamspex.auth.PhoneNumberNormalizer;
import com.dreamspex.auth.entity.CustomerProfile;
import com.dreamspex.auth.entity.OtpChallenge;
import com.dreamspex.auth.entity.RefreshToken;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.CustomerProfileRepository;
import com.dreamspex.auth.repository.OtpChallengeRepository;
import com.dreamspex.auth.repository.RefreshTokenRepository;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.franchise.FranchiseUserRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.SecurityProperties;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.security.JwtService;
import com.dreamspex.loyalty.LoyaltyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static com.dreamspex.auth.dto.AuthDtos.*;

@Service
public class AuthService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final OtpChallengeRepository challenges;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityProperties securityProperties;
    private final CustomerProfileRepository profiles;
    private final OtpDeliveryService otpDelivery;
    private final AuditLogService auditLogs;
    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec otpKey;
    @Autowired
    private LoyaltyService loyaltyService;
    @Autowired
    private FranchiseUserRepository franchiseUsers;

    public AuthService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       OtpChallengeRepository challenges, PasswordEncoder passwordEncoder, JwtService jwtService,
                       SecurityProperties securityProperties, CustomerProfileRepository profiles,
                       OtpDeliveryService otpDelivery, AuditLogService auditLogs) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.challenges = challenges;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityProperties = securityProperties;
        this.profiles = profiles;
        this.otpDelivery = otpDelivery;
        this.auditLogs = auditLogs;
        if (securityProperties.otpSecret() == null
                || securityProperties.otpSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("DREAMSPEX_OTP_SECRET must contain at least 32 bytes");
        }
        this.otpKey = new SecretKeySpec(
                securityProperties.otpSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if ((request.email() == null || request.email().isBlank()) && (request.phone() == null || request.phone().isBlank())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "IDENTIFIER_REQUIRED", "Email or phone is required.");
        }
        String email = normalizeEmail(request.email());
        String phone = PhoneNumberNormalizer.normalize(request.phone());
        if (request.phone() != null && !request.phone().isBlank() && phone == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PHONE", "Enter a valid phone number, such as +91XXXXXXXXXX.");
        }
        if (email != null && users.findByEmailIgnoreCaseAndDeletedAtIsNull(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "IDENTIFIER_EXISTS", "An account already exists.");
        }
        if (phone != null && users.findByPhoneAndDeletedAtIsNull(phone).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "IDENTIFIER_EXISTS", "An account already exists.");
        }
        User user = new User();
        user.setEmail(email);
        user.setPhone(phone);
        user.setDisplayName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus("PENDING_VERIFICATION");
        user.getRoles().add(roles.findByCode("CUSTOMER").orElseThrow());
        users.save(user);
        CustomerProfile profile = new CustomerProfile();
        profile.setUser(user);
        profile.setFirstName(request.name().trim());
        profiles.save(profile);
        if (loyaltyService != null) loyaltyService.initializeCustomer(user);
        if (request.referralCode() != null && !request.referralCode().isBlank()) {
            loyaltyService.registerReferral(user, request.referralCode());
        }
        OtpChallenge challenge = createChallenge(user, email != null ? email : phone, "REGISTRATION");
        auditLogs.record(user, "AUTH_REGISTERED");
        return new RegisterResponse(user.getId(), true, Set.of(email != null ? "EMAIL" : "SMS"), challenge.getId());
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = findUser(request.identifier());
        requireRole(user, "CUSTOMER");
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())
                || !"ACTIVE".equals(user.getStatus())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials.");
        }
        user.setLastLoginAt(Instant.now());
        auditLogs.record(user, "AUTH_LOGIN");
        return tokensFor(user, UUID.randomUUID().toString());
    }

    @Transactional
    public TokenResponse adminLogin(LoginRequest request) {
        User user = findUser(request.identifier());
        requireRole(user, "SUPER_ADMIN");
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())
                || !"ACTIVE".equals(user.getStatus())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials.");
        }
        user.setLastLoginAt(Instant.now());
        auditLogs.record(user, "AUTH_ADMIN_LOGIN");
        return tokensFor(user, UUID.randomUUID().toString());
    }

    @Transactional
    public TokenResponse franchiseLogin(LoginRequest request) {
        User user = findUser(request.identifier());
        requireRole(user, "FRANCHISE_ADMIN");
        boolean assignedToActiveFranchise = franchiseUsers != null
                && franchiseUsers.findByUserId(user.getId())
                .map(link -> link.getStore().isFranchiseManaged() && "ACTIVE".equals(link.getStore().getStatus()))
                .orElse(false);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())
                || !"ACTIVE".equals(user.getStatus()) || !assignedToActiveFranchise) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials.");
        }
        user.setLastLoginAt(Instant.now());
        auditLogs.record(user, "AUTH_FRANCHISE_LOGIN");
        return tokensFor(user, UUID.randomUUID().toString());
    }

    @Transactional
    public SimpleResponse resendOtp(ResendOtpRequest request) {
        OtpChallenge challenge = challenges.findById(request.challengeId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null || challenge.getExpiresAt().isBefore(now)
                || challenge.getResendCount() >= 5
                || (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plusSeconds(30).isAfter(now))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_UNAVAILABLE",
                    "OTP resend is temporarily unavailable.");
        }
        int code = 100000 + random.nextInt(900000);
        challenge.setCodeHash(hashOtp(Integer.toString(code)));
        challenge.setAttempts(0);
        challenge.setResendCount(challenge.getResendCount() + 1);
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenges.save(challenge);
        otpDelivery.send(challenge.getIdentifier(), challenge.getDeliveryChannel(), challenge.getPurpose(),
                challenge.getId(), Integer.toString(code));
        return new SimpleResponse(true);
    }

    @Transactional
    public SimpleResponse verifyOtp(VerifyOtpRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "REGISTRATION")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        verifyChallenge(challenge, request.otp());
        User user = users.findById(challenge.getUserId()).orElseThrow();
        user.setStatus("ACTIVE");
        if (user.getEmail() != null && user.getEmail().equalsIgnoreCase(challenge.getIdentifier())) user.setEmailVerifiedAt(Instant.now());
        if (user.getPhone() != null && user.getPhone().equals(challenge.getIdentifier())) user.setPhoneVerifiedAt(Instant.now());
        auditLogs.record(user, "AUTH_OTP_VERIFIED");
        return new SimpleResponse(true);
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(IdentifierRequest request) {
        String email = normalizeEmail(request.identifier());
        String identifier = email != null ? email : request.identifier().trim();
        var user = email == null
                ? users.findByPhoneAndDeletedAtIsNull(identifier)
                : users.findByEmailIgnoreCaseAndDeletedAtIsNull(email);
        String challengeId = user.map(value -> createChallenge(value, identifier, "PASSWORD_RESET").getId())
                .orElseGet(() -> UUID.randomUUID().toString());
        return new ForgotPasswordResponse(true, challengeId);
    }

    @Transactional
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "PASSWORD_RESET")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        verifyChallenge(challenge, request.otp());
        User user = users.findById(challenge.getUserId()).orElseThrow();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.incrementTokenVersion();
        refreshTokens.revokeUserTokens(user.getId(), Instant.now());
        auditLogs.record(user, "AUTH_PASSWORD_RESET");
        return new ResetPasswordResponse(true, true);
    }

    @Transactional
    public ResetPasswordResponse setupFranchisePassword(FranchiseSetupRequest request) {
        var link = franchiseUsers.findByInvitationTokenHashForUpdate(hash(request.token()))
                .filter(value -> value.getInvitationExpiresAt() != null
                        && value.getInvitationExpiresAt().isAfter(Instant.now()))
                .filter(value -> value.getStore().isFranchiseManaged()
                        && "ACTIVE".equals(value.getStore().getStatus()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITATION",
                        "This franchise setup link is invalid or has expired."));
        User user = link.getUser();
        if (!"ACTIVE".equals(user.getStatus())
                || user.getRoles().stream().noneMatch(role -> "FRANCHISE_ADMIN".equals(role.getCode()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INVITATION",
                    "This franchise setup link is invalid or has expired.");
        }
        link.setInvitationTokenHash(null);
        link.setInvitationExpiresAt(null);
        franchiseUsers.save(link);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setEmailVerifiedAt(Instant.now());
        user.incrementTokenVersion();
        refreshTokens.revokeUserTokens(user.getId(), Instant.now());
        auditLogs.record(user, "AUTH_FRANCHISE_PASSWORD_SETUP");
        return new ResetPasswordResponse(true, true);
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        RefreshToken current = refreshTokens.findByTokenHash(hash(request.refreshToken()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token."));
        if (current.getRevokedAt() != null || current.getExpiresAt().isBefore(Instant.now())) {
            refreshTokens.revokeFamily(current.getFamilyId(), Instant.now());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
        }
        IssuedTokens issued = issueTokens(current.getUser(), current.getFamilyId());
        if (refreshTokens.revokeIfActive(current.getId(), Instant.now(), issued.refreshToken().getId()) != 1) {
            refreshTokens.revokeFamily(current.getFamilyId(), Instant.now());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_REUSE", "Invalid refresh token.");
        }
        return issued.response();
    }

    @Transactional
    public SimpleResponse logout(RefreshRequest request) {
        refreshTokens.findByTokenHash(hash(request.refreshToken()))
                .ifPresent(token -> {
                    refreshTokens.revokeFamily(token.getFamilyId(), Instant.now());
                    token.getUser().incrementTokenVersion();
                    auditLogs.record(token.getUser(), "AUTH_LOGOUT");
                });
        return new SimpleResponse(true);
    }

    private TokenResponse tokensFor(User user, String familyId) {
        return issueTokens(user, familyId).response();
    }

    private IssuedTokens issueTokens(User user, String familyId) {
        String rawRefresh = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken refresh = new RefreshToken();
        refresh.setUser(user);
        refresh.setFamilyId(familyId);
        refresh.setTokenHash(hash(rawRefresh));
        refresh.setExpiresAt(Instant.now().plus(securityProperties.refreshTokenDays(), ChronoUnit.DAYS));
        refreshTokens.save(refresh);
        return new IssuedTokens(new TokenResponse(jwtService.issue(user), rawRefresh,
                securityProperties.accessTokenMinutes() * 60, UserResponse.from(user)), refresh);
    }

    private OtpChallenge createChallenge(User user, String identifier, String purpose) {
        int code = 100000 + random.nextInt(900000);
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(identifier);
        challenge.setPurpose(purpose);
        challenge.setDeliveryChannel(identifier.startsWith("+") ? "SMS" : "EMAIL");
        challenge.setCodeHash(hashOtp(Integer.toString(code)));
        challenge.setExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
        challenge.setLastSentAt(Instant.now());
        OtpChallenge saved = challenges.save(challenge);
        otpDelivery.send(identifier, challenge.getDeliveryChannel(), purpose, saved.getId(), Integer.toString(code));
        return saved;
    }

    private void verifyChallenge(OtpChallenge challenge, String otp) {
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null || challenge.getExpiresAt().isBefore(now) || challenge.getAttempts() >= 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }
        if (!MessageDigest.isEqual(hashOtp(otp).getBytes(StandardCharsets.UTF_8),
                challenge.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            challenges.incrementAttempts(challenge.getId(), now);
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Invalid or expired challenge.");
        }
        if (challenges.consumeIfValid(challenge.getId(), challenge.getCodeHash(), now) != 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }
    }

    private User findUser(String identifier) {
        String email = normalizeEmail(identifier);
        var user = email == null
                ? users.findByPhoneAndDeletedAtIsNull(identifier)
                : users.findByEmailIgnoreCaseAndDeletedAtIsNull(email);
        return user.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials."));
    }

    private String normalizeEmail(String value) {
        return value == null || value.isBlank() || !value.contains("@") ? null : value.trim().toLowerCase();
    }

    private String normalizeIdentifier(String value) {
        String email = normalizeEmail(value);
        return email != null ? email : value.trim();
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash token", exception);
        }
    }

    private String hashOtp(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(otpKey);
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash OTP", exception);
        }
    }

    private void requireRole(User user, String role) {
        if (user.getRoles().stream().noneMatch(roleValue -> role.equals(roleValue.getCode()))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials.");
        }
    }

    private record IssuedTokens(TokenResponse response, RefreshToken refreshToken) {}
}
