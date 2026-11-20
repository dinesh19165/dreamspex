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
import com.dreamspex.auth.dto.AuthDtos.RegistrationOtpOptions;
import com.dreamspex.auth.dto.AuthDtos.RegistrationWidgetConfig;
import com.dreamspex.auth.dto.AuthDtos.WidgetAccessTokenRequest;
import com.dreamspex.auth.dto.AuthDtos.WidgetOtpSentRequest;
import com.dreamspex.franchise.FranchiseUserRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.SecurityProperties;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.security.JwtService;
import com.dreamspex.loyalty.LoyaltyService;
import com.dreamspex.notification.Msg91OtpWidgetClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.net.URLEncoder;
import java.util.HexFormat;
import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static com.dreamspex.auth.dto.AuthDtos.*;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final OtpChallengeRepository challenges;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityProperties securityProperties;
    private final CustomerProfileRepository profiles;
    private final OtpDeliveryService otpDelivery;
    private final Msg91OtpWidgetClient otpWidgetClient;
    private final RegistrationOtpSettingsService registrationOtpSettings;
    private final AuditLogService auditLogs;
    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec otpKey;
    @Value("${dreamspex.frontend-base-url:${FRONTEND_BASE_URL:https://www.dreamspex.in}}")
    private String frontendBaseUrl = "https://www.dreamspex.in";
    @Autowired
    private LoyaltyService loyaltyService;
    @Autowired
    private FranchiseUserRepository franchiseUsers;

    public AuthService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       OtpChallengeRepository challenges, PasswordEncoder passwordEncoder, JwtService jwtService,
                       SecurityProperties securityProperties, CustomerProfileRepository profiles,
                       OtpDeliveryService otpDelivery, Msg91OtpWidgetClient otpWidgetClient, AuditLogService auditLogs,
                       RegistrationOtpSettingsService registrationOtpSettings) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.challenges = challenges;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityProperties = securityProperties;
        this.profiles = profiles;
        this.otpDelivery = otpDelivery;
        this.otpWidgetClient = otpWidgetClient;
        this.auditLogs = auditLogs;
        this.registrationOtpSettings = registrationOtpSettings;
        if (securityProperties.otpSecret() == null
                || securityProperties.otpSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("DREAMSPEX_OTP_SECRET must contain at least 32 bytes");
        }
        this.otpKey = new SecretKeySpec(
                securityProperties.otpSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        RegistrationOtpOptions options = registrationOtpSettings.current();
        String channel = chooseRegistrationChannel(request.verificationChannel(), options);
        String email = normalizeEmail(request.email());
        String phone = PhoneNumberNormalizer.normalize(request.phone());
        if (request.email() != null && !request.email().isBlank() && email == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_EMAIL", "Enter a valid email address.");
        }
        if (request.phone() != null && !request.phone().isBlank() && phone == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PHONE", "Enter a valid international phone number with country code.");
        }
        String identifier = "EMAIL".equals(channel) ? email : phone;
        if (identifier == null) {
            String field = "EMAIL".equals(channel) ? "Email" : "Phone number";
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "EMAIL".equals(channel) ? "EMAIL_REQUIRED" : "PHONE_REQUIRED",
                    field + " is required for the selected verification method.");
        }
        assertUniqueIdentifiers(email, phone, null);
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
        OtpChallenge challenge = "SMS".equals(channel)
                ? createWidgetRegistrationChallenge(user, identifier)
                : createChallenge(user, identifier, "REGISTRATION", channel);
        auditLogs.record(user, "AUTH_REGISTERED");
        return new RegisterResponse(user.getId(), true, Set.of(channel), challenge.getId());
    }

    @Transactional
    public RegistrationOtpOptions registrationOtpOptions() {
        return registrationOtpSettings.current();
    }

    public RegistrationWidgetConfig registrationWidgetConfig() {
        requireRegistrationChannelEnabled("SMS", registrationOtpSettings.current());
        return registrationOtpSettings.widgetConfig();
    }

    public RegistrationWidgetConfig passwordResetWidgetConfig() {
        return registrationOtpSettings.widgetConfig();
    }

    @Transactional
    public RegisterResponse changeRegistrationContact(ChangeRegistrationRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "REGISTRATION")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        User user = users.findById(challenge.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        if (challenge.getVerifiedAt() != null || !"PENDING_VERIFICATION".equals(user.getStatus())
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }

        String channel = chooseRegistrationChannel(request.verificationChannel(), registrationOtpSettings.current());
        String email = normalizeEmail(request.email());
        String phone = PhoneNumberNormalizer.normalize(request.phone());
        if (request.email() != null && !request.email().isBlank() && email == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_EMAIL", "Enter a valid email address.");
        }
        if (request.phone() != null && !request.phone().isBlank() && phone == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PHONE", "Enter a valid international phone number with country code.");
        }
        String identifier = "EMAIL".equals(channel) ? email : phone;
        if (identifier == null) {
            String field = "EMAIL".equals(channel) ? "Email" : "Phone number";
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "EMAIL".equals(channel) ? "EMAIL_REQUIRED" : "PHONE_REQUIRED",
                    field + " is required for the selected verification method.");
        }
        assertUniqueIdentifiers(email, phone, user.getId());

        Instant now = Instant.now();
        if (challenge.getResendCount() >= 5) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_LIMIT", "The verification code resend limit has been reached.");
        }
        if (challenge.getLastSentAt() != null && challenge.getLastSentAt().plusSeconds(30).isAfter(now)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_COOLDOWN", "Wait before requesting another verification code.");
        }

        user.setEmail(email);
        user.setPhone(phone);
        users.save(user);
        challenge.setIdentifier(identifier);
        challenge.setDeliveryChannel(channel);
        boolean widgetRegistration = "SMS".equals(channel);
        String otp = widgetRegistration ? null : Integer.toString(100000 + random.nextInt(900000));
        challenge.setAttempts(0);
        challenge.setResendCount(challenge.getResendCount() + 1);
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenge.setCodeHash(otp == null ? null : hashOtp(otp));
        challenge.setProviderRequestId(null);
        challenges.save(challenge);
        if (!widgetRegistration) {
            otpDelivery.send(identifier, channel, challenge.getPurpose(), challenge.getId(), otp);
        }
        auditLogs.record(user, "AUTH_REGISTRATION_CONTACT_UPDATED");
        return new RegisterResponse(user.getId(), true, Set.of(channel), challenge.getId());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse login(LoginRequest request) {
        User user = findUserByIdentifier(request.identifier()).orElse(null);
        if (user == null || user.getRoles().stream().noneMatch(role -> "CUSTOMER".equals(role.getCode()))
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCustomerCredentials();
        }
        if (!"ACTIVE".equals(user.getStatus())
                || (user.getPhoneVerifiedAt() == null && user.getEmailVerifiedAt() == null)) {
            throw verificationRequired(user, request.identifier());
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
    public ResendOtpResponse resendOtp(ResendOtpRequest request) {
        var storedChallenge = challenges.findById(request.challengeId());
        if (storedChallenge.isEmpty()) {
            return new ResendOtpResponse(false, null);
        }
        OtpChallenge challenge = storedChallenge.get();
        if (isWidgetRegistration(challenge)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_WIDGET_CLIENT_REQUIRED",
                    "Mobile verification must be resent through the OTP Widget.");
        }
        if ("REGISTRATION".equals(challenge.getPurpose())) {
            requireRegistrationChannelEnabled(challenge.getDeliveryChannel(), registrationOtpSettings.current());
        }
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null || challenge.getResendCount() >= 5
                || (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plusSeconds(30).isAfter(now))) {
            return new ResendOtpResponse(false, challenge.getId());
        }
        requireLatestChallenge(challenge, now);
        String otp = Integer.toString(100000 + random.nextInt(900000));
        OtpChallenge replacement = replacementChallenge(challenge, now);
        replacement.setCodeHash(hashOtp(otp));
        challenges.expirePendingByIdentifierAndPurpose(challenge.getIdentifier(), challenge.getPurpose(), now);
        challenges.save(replacement);
        otpDelivery.send(replacement.getIdentifier(), replacement.getDeliveryChannel(), replacement.getPurpose(),
                replacement.getId(), otp);
        return new ResendOtpResponse(true, replacement.getId());
    }

    @Transactional
    public ResendOtpResponse resendWidgetOtp(ResendOtpRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "REGISTRATION").orElse(null);
        if (challenge == null || !isWidgetRegistration(challenge)
                || challenge.getProviderRequestId() == null || challenge.getProviderRequestId().isBlank()) {
            return new ResendOtpResponse(false, null);
        }
        User user = users.findById(challenge.getUserId()).orElse(null);
        Instant now = Instant.now();
        if (user == null || !"PENDING_VERIFICATION".equals(user.getStatus())
                || challenge.getVerifiedAt() != null || challenge.getResendCount() >= 5
                || (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plusSeconds(30).isAfter(now))) {
            return new ResendOtpResponse(false, challenge.getId());
        }
        requireLatestChallenge(challenge, now);
        requireRegistrationChannelEnabled("SMS", registrationOtpSettings.current());
        OtpChallenge replacement = replacementChallenge(challenge, now);
        replacement.setCodeHash(null);
        replacement.setProviderRequestId(challenge.getProviderRequestId());
        challenges.expirePendingByIdentifierAndPurpose(challenge.getIdentifier(), challenge.getPurpose(), now);
        challenges.save(replacement);
        return new ResendOtpResponse(true, replacement.getId());
    }

    @Transactional
    public SimpleResponse registrationWidgetSent(WidgetOtpSentRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "REGISTRATION").orElse(null);
        if (challenge == null || !isWidgetRegistration(challenge)) {
            return new SimpleResponse(false);
        }
        Instant now = Instant.now();
        if (challenge.getExpiresAt().isBefore(now)) {
            return new SimpleResponse(false);
        }
        Optional<OtpChallenge> latest = challenges.findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
                challenge.getIdentifier(), challenge.getPurpose(), now);
        if (latest.isPresent() && !latest.get().getId().equals(challenge.getId())) {
            return new SimpleResponse(false);
        }
        if (challenge.getProviderRequestId() != null
                && challenge.getProviderRequestId().equals(request.requestId())) {
            return new SimpleResponse(true);
        }
        if (challenge.getProviderRequestId() != null && challenge.getResendCount() == 0) {
            return new SimpleResponse(false);
        }
        User user = users.findById(challenge.getUserId()).orElse(null);
        if (user == null || !"PENDING_VERIFICATION".equals(user.getStatus())
                || challenge.getVerifiedAt() != null) {
            return new SimpleResponse(false);
        }
        requireRegistrationChannelEnabled("SMS", registrationOtpSettings.current());
        challenge.setProviderRequestId(request.requestId().trim());
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenges.save(challenge);
        return new SimpleResponse(true);
    }

    @Transactional
    public OtpVerificationResponse verifyOtp(VerifyOtpRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "REGISTRATION")
                .orElseThrow(() -> challengeExpired());
        User user = users.findById(challenge.getUserId())
                .orElseThrow(() -> challengeExpired());
        if (challenge.getVerifiedAt() != null) {
            ensureVerifiedUserIsActive(user, challenge);
            return otpAlreadyVerified(challenge);
        }
        Instant now = Instant.now();
        requireLatestChallenge(challenge, now);
        requireUnexpiredOtp(challenge, now);
        if (challenge.getAttempts() >= 5) {
            throw otpInvalid();
        }
        if (!"PENDING_VERIFICATION".equals(user.getStatus())) {
            throw challengeExpired();
        }
        requireRegistrationChannelEnabled(challenge.getDeliveryChannel(), registrationOtpSettings.current());
        if (isWidgetRegistration(challenge)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_WIDGET_CLIENT_REQUIRED",
                    "Mobile verification must be completed through the OTP Widget.");
        }
        String candidateHash = hashOtp(request.otp());
        if (!MessageDigest.isEqual(candidateHash.getBytes(StandardCharsets.UTF_8),
                challenge.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            challenges.incrementAttempts(challenge.getId(), now);
            throw otpInvalid();
        }
        if (challenges.consumeIfValid(challenge.getId(), challenge.getCodeHash(), now) != 1) {
            if (isChallengeVerified(challenge)) {
                ensureVerifiedUserIsActive(user, challenge);
                return otpAlreadyVerified(challenge);
            }
            throw challengeExpired();
        }
        activateVerifiedRegistration(user, challenge);
        return otpVerified(challenge);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public OtpVerificationResponse verifyWidgetAccessToken(WidgetAccessTokenRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurposeForUpdate(request.challengeId(), "REGISTRATION")
                .orElseThrow(() -> challengeExpired());
        User user = users.findById(challenge.getUserId())
                .orElseThrow(() -> challengeExpired());
        if (challenge.getVerifiedAt() != null) {
            ensureVerifiedUserIsActive(user, challenge);
            return otpAlreadyVerified(challenge);
        }
        Instant now = Instant.now();
        requireLatestChallenge(challenge, now);
        requireUnexpiredOtp(challenge, now);
        if (!isWidgetRegistration(challenge) || challenge.getAttempts() >= 5
                || challenge.getProviderRequestId() == null || challenge.getProviderRequestId().isBlank()) {
            throw challengeExpired();
        }
        if (!"PENDING_VERIFICATION".equals(user.getStatus())) {
            throw challengeExpired();
        }
        requireRegistrationChannelEnabled("SMS", registrationOtpSettings.current());

        String verifiedIdentifier;
        boolean alreadyVerified = false;
        try {
            verifiedIdentifier = otpWidgetClient.verifyAccessToken(request.accessToken());
        } catch (Msg91OtpWidgetClient.AuthenticationFailureException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MSG91_AUTHENTICATION_FAILED",
                    "MSG91 Authentication Failed - Check AuthKey/WidgetId in backend config.");
        } catch (Msg91OtpWidgetClient.AlreadyVerifiedException exception) {
            verifiedIdentifier = challenge.getIdentifier();
            alreadyVerified = true;
        } catch (Msg91OtpWidgetClient.InvalidAccessTokenException exception) {
            if (isChallengeVerified(challenge)) {
                ensureVerifiedUserIsActive(user, challenge);
                return otpAlreadyVerified(challenge);
            }
            challenge.setAttempts(challenge.getAttempts() + 1);
            throw otpInvalid();
        } catch (Msg91OtpWidgetClient.ProviderException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OTP_VERIFICATION_FAILED",
                    "The mobile verification service is unavailable. Please try again later.");
        }
        if (!samePhone(challenge.getIdentifier(), verifiedIdentifier)
                || !samePhone(user.getPhone(), challenge.getIdentifier())) {
            throw otpInvalid();
        }
        if (challenges.consumeWidgetIfValid(challenge.getId(), user.getId(),
                challenge.getProviderRequestId(), Instant.now()) != 1) {
            if (isChallengeVerified(challenge)) {
                ensureVerifiedUserIsActive(user, challenge);
                return otpAlreadyVerified(challenge);
            }
            throw challengeExpired();
        }
        activateVerifiedRegistration(user, challenge);
        return alreadyVerified
                ? otpAlreadyVerified(challenge)
                : otpVerified(challenge);
    }

    private void activateVerifiedRegistration(User user, OtpChallenge challenge) {
        user.setStatus("ACTIVE");
        if (user.getEmail() != null && user.getEmail().equalsIgnoreCase(challenge.getIdentifier())) user.setEmailVerifiedAt(Instant.now());
        if (user.getPhone() != null && user.getPhone().equals(challenge.getIdentifier())) user.setPhoneVerifiedAt(Instant.now());
        auditLogs.record(user, "AUTH_OTP_VERIFIED");
    }

    private void ensureVerifiedUserIsActive(User user, OtpChallenge challenge) {
        boolean contactVerified = "SMS".equalsIgnoreCase(challenge.getDeliveryChannel())
                ? user.getPhoneVerifiedAt() != null
                : user.getEmailVerifiedAt() != null;
        if (!"ACTIVE".equals(user.getStatus()) || !contactVerified) {
            activateVerifiedRegistration(user, challenge);
        }
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(IdentifierRequest request) {
        String submittedIdentifier = request.identifier().trim();
        boolean emailFlow = submittedIdentifier.contains("@");
        Optional<User> user = findUserByIdentifier(submittedIdentifier);
        String identifier = user.map(value -> emailFlow
                        ? normalizeEmail(value.getEmail())
                        : PhoneNumberNormalizer.normalizeOrOriginal(value.getPhone()))
                .orElseGet(() -> emailFlow
                        ? normalizeEmail(submittedIdentifier)
                        : normalizeResetPhoneIdentifier(submittedIdentifier));
        String challengeId = UUID.randomUUID().toString();
        if (identifier != null) {
            enforcePasswordResetRequestLimits(identifier, Instant.now());
            OtpChallenge challenge = user.map(value -> emailFlow
                            ? createPasswordResetLinkChallenge(value, identifier)
                            : createWidgetPasswordResetChallenge(value, identifier))
                    .orElseGet(() -> createDecoyPasswordResetChallenge(identifier, emailFlow));
            challengeId = challenge.getId();
        }
        return new ForgotPasswordResponse(true, emailFlow ? "EMAIL" : "PHONE",
                emailFlow ? "CHECK_EMAIL" : "VERIFY_OTP",
                "If an account exists, reset instructions have been sent.", challengeId);
    }

    @Transactional
    public SimpleResponse passwordResetWidgetSent(WidgetOtpSentRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "PASSWORD_RESET")
                .orElse(null);
        if (challenge == null || !isWidgetPasswordReset(challenge)) {
            return new SimpleResponse(false);
        }
        Instant now = Instant.now();
        if (!challenge.getExpiresAt().isAfter(now)) {
            return new SimpleResponse(false);
        }
        Optional<OtpChallenge> latest = challenges.findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
                challenge.getIdentifier(), challenge.getPurpose(), now);
        if (latest.isPresent() && !latest.get().getId().equals(challenge.getId())) {
            return new SimpleResponse(false);
        }
        if (challenge.getProviderRequestId() != null
                && challenge.getProviderRequestId().equals(request.requestId())) {
            return new SimpleResponse(true);
        }
        if (challenge.getProviderRequestId() != null && challenge.getResendCount() == 0) {
            return new SimpleResponse(false);
        }
        challenge.setProviderRequestId(request.requestId().trim());
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenges.save(challenge);
        log.info("MSG91 password-reset OTP send acknowledged operation=sendOtp requestId={}",
                request.requestId().trim());
        return new SimpleResponse(true);
    }

    @Transactional
    public ResendOtpResponse resendPasswordResetWidgetOtp(ResendOtpRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "PASSWORD_RESET")
                .orElse(null);
        if (challenge == null || !isWidgetPasswordReset(challenge)
                || challenge.getProviderRequestId() == null || challenge.getProviderRequestId().isBlank()) {
            return new ResendOtpResponse(false, null);
        }
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null || challenge.getAttempts() >= 5
                || challenge.getResendCount() >= 5
                || (challenge.getLastSentAt() != null
                && challenge.getLastSentAt().plusSeconds(30).isAfter(now))) {
            return new ResendOtpResponse(false, challenge.getId());
        }
        requireLatestChallenge(challenge, now);
        if (challenges.countByIdentifierAndPurposeAndCreatedAtAfter(
                challenge.getIdentifier(), "PASSWORD_RESET", now.minus(10, ChronoUnit.MINUTES)) >= 3) {
            throw resetRequestLimit();
        }
        OtpChallenge replacement = replacementChallenge(challenge, now);
        replacement.setCodeHash(null);
        replacement.setProviderRequestId(null);
        challenges.expirePendingByIdentifierAndPurpose(challenge.getIdentifier(), challenge.getPurpose(), now);
        challenges.save(replacement);
        return new ResendOtpResponse(true, replacement.getId());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public ResetOtpVerificationResponse verifyResetWidgetAccessToken(WidgetAccessTokenRequest request) {
        OtpChallenge challenge = challenges.findByIdAndPurposeForUpdate(
                        request.challengeId(), "PASSWORD_RESET")
                .orElseThrow(this::challengeExpired);
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null) {
            throw invalidResetOtp();
        }
        requireLatestChallenge(challenge, now);
        requireUnexpiredOtp(challenge, now);
        if (!isWidgetPasswordReset(challenge) || challenge.getAttempts() >= 5
                || challenge.getProviderRequestId() == null || challenge.getProviderRequestId().isBlank()) {
            throw challengeExpired();
        }

        String verifiedIdentifier;
        try {
            verifiedIdentifier = otpWidgetClient.verifyAccessToken(request.accessToken());
        } catch (Msg91OtpWidgetClient.AuthenticationFailureException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MSG91_AUTHENTICATION_FAILED",
                    "MSG91 Authentication Failed - Check AuthKey/WidgetId in backend config.");
        } catch (Msg91OtpWidgetClient.AlreadyVerifiedException exception) {
            verifiedIdentifier = challenge.getIdentifier();
        } catch (Msg91OtpWidgetClient.InvalidAccessTokenException exception) {
            challenges.incrementPasswordResetAttempts(
                    challenge.getId(), now, now.plus(15, ChronoUnit.MINUTES));
            throw invalidResetOtp();
        } catch (Msg91OtpWidgetClient.ProviderException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OTP_VERIFICATION_FAILED",
                    "The mobile verification service is unavailable. Please try again later.");
        }
        if (!samePhone(challenge.getIdentifier(), verifiedIdentifier)) {
            throw invalidResetOtp();
        }
        if (challenges.consumeResetWidgetIfValid(
                challenge.getId(), challenge.getProviderRequestId(), Instant.now()) != 1) {
            throw challengeExpired();
        }
        return issueResetToken(challenge);
    }

    @Transactional
    public ResetOtpVerificationResponse verifyResetOtp(VerifyResetOtpRequest request) {
        User user = findUserByIdentifier(request.identifier())
                .orElseThrow(this::invalidResetOtp);
        String identifier = canonicalResetIdentifier(user, request.identifier());
        OtpChallenge challenge = challenges
                .findFirstByIdentifierAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(identifier, "PASSWORD_RESET")
                .orElseThrow(this::invalidResetOtp);
        Instant now = Instant.now();
        if (challenge.getLockedUntil() != null && challenge.getLockedUntil().isAfter(now)) {
            throw resetOtpLocked();
        }
        if (challenge.getExpiresAt() == null || !challenge.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED",
                    "This reset code has expired. Request a new code.");
        }
        if (challenge.getAttempts() >= 5) {
            throw resetOtpLocked();
        }
        String otpHash = hashOtp(request.otp());
        if (challenge.getCodeHash() == null
                || !MessageDigest.isEqual(otpHash.getBytes(StandardCharsets.UTF_8),
                challenge.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            challenges.incrementPasswordResetAttempts(challenge.getId(), now, now.plus(15, ChronoUnit.MINUTES));
            throw invalidResetOtp();
        }

        if (challenges.consumeIfValid(challenge.getId(), challenge.getCodeHash(), now) != 1) {
            throw invalidResetOtp();
        }
        return issueResetToken(challenge);
    }

    private ResetOtpVerificationResponse issueResetToken(OtpChallenge challenge) {
        Instant now = Instant.now();
        String resetToken = randomToken();
        challenge.setVerifiedAt(now);
        challenge.setCodeHash(hash(resetToken));
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenge.setUpdatedAt(now);
        challenges.save(challenge);
        return new ResetOtpVerificationResponse(true, resetToken, 600);
    }

    @Transactional
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        if (request.resetToken() != null && !request.resetToken().isBlank()) {
            return resetPasswordWithToken(request);
        }
        if (request.challengeId() == null || request.challengeId().isBlank()
                || request.otp() == null || request.otp().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }
        OtpChallenge challenge = challenges.findByIdAndPurpose(request.challengeId(), "PASSWORD_RESET")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge."));
        verifyChallenge(challenge, request.otp(), true);
        User user = users.findById(challenge.getUserId()).orElseThrow();
        completePasswordReset(user, request.newPassword());
        return new ResetPasswordResponse(true, true);
    }

    private ResetPasswordResponse resetPasswordWithToken(ResetPasswordRequest request) {
        if (request.identifier() == null || request.identifier().isBlank()) {
            throw invalidResetToken();
        }
        User user = findUserByIdentifier(request.identifier()).orElseThrow(this::invalidResetToken);
        String identifier = canonicalResetIdentifier(user, request.identifier());
        String tokenHash = hash(request.resetToken());
        OtpChallenge challenge = challenges.findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(
                        identifier, "PASSWORD_RESET")
                .filter(value -> value.getCodeHash() != null
                        && MessageDigest.isEqual(tokenHash.getBytes(StandardCharsets.UTF_8),
                        value.getCodeHash().getBytes(StandardCharsets.UTF_8))
                        && value.getExpiresAt() != null && value.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(this::invalidResetToken);
        if ("SMS".equalsIgnoreCase(challenge.getDeliveryChannel()) && challenge.getVerifiedAt() == null) {
            throw invalidResetToken();
        }
        Instant now = Instant.now();
        if (challenges.consumeResetToken(challenge.getId(), tokenHash, now) != 1) {
            throw invalidResetToken();
        }
        completePasswordReset(user, request.newPassword());
        return new ResetPasswordResponse(true, true);
    }

    private void completePasswordReset(User user, String newPassword) {
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.incrementTokenVersion();
        Instant now = Instant.now();
        refreshTokens.revokeUserTokens(user.getId(), now);
        challenges.expireAllPasswordResetChallenges(user.getId(), now);
        auditLogs.record(user, "AUTH_PASSWORD_RESET");
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
        return createChallenge(user, identifier, purpose, identifier.startsWith("+") ? "SMS" : "EMAIL");
    }

    private OtpChallenge createChallenge(User user, String identifier, String purpose, String channel) {
        Instant now = Instant.now();
        challenges.expirePendingByIdentifierAndPurpose(identifier, purpose, now);
        int code = 100000 + random.nextInt(900000);
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(identifier);
        challenge.setPurpose(purpose);
        challenge.setDeliveryChannel(channel);
        challenge.setCodeHash(hashOtp(Integer.toString(code)));
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        challenge.setLastSentAt(now);
        OtpChallenge saved = challenges.save(challenge);
        otpDelivery.send(identifier, challenge.getDeliveryChannel(), purpose, saved.getId(), Integer.toString(code));
        return saved;
    }

    private OtpChallenge createPasswordResetLinkChallenge(User user, String identifier) {
        Instant now = Instant.now();
        challenges.expirePendingByIdentifierAndPurpose(identifier, "PASSWORD_RESET", now);
        String resetToken = randomToken();
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(identifier);
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("EMAIL");
        challenge.setCodeHash(hash(resetToken));
        challenge.setExpiresAt(now.plus(15, ChronoUnit.MINUTES));
        challenge.setLastSentAt(now);
        OtpChallenge saved = challenges.save(challenge);
        String baseUrl = frontendBaseUrl.replaceAll("/+$", "");
        String resetLink = baseUrl + "/reset-password?identifier="
                + URLEncoder.encode(identifier, StandardCharsets.UTF_8)
                + "&token=" + URLEncoder.encode(resetToken, StandardCharsets.UTF_8);
        otpDelivery.sendPasswordResetLink(identifier, resetLink);
        return saved;
    }

    private OtpChallenge createDecoyPasswordResetChallenge(String identifier, boolean emailFlow) {
        Instant now = Instant.now();
        challenges.expirePendingByIdentifierAndPurpose(identifier, "PASSWORD_RESET", now);
        OtpChallenge challenge = new OtpChallenge();
        challenge.setIdentifier(identifier);
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel(emailFlow ? "EMAIL" : "SMS");
        challenge.setCodeHash(hash(randomToken()));
        challenge.setExpiresAt(now.plus(emailFlow ? 15 : 10, ChronoUnit.MINUTES));
        challenge.setLastSentAt(now);
        return challenges.save(challenge);
    }

    private void enforcePasswordResetRequestLimits(String identifier, Instant now) {
        if (challenges.findFirstByIdentifierAndPurposeAndLockedUntilAfterOrderByCreatedAtDesc(
                identifier, "PASSWORD_RESET", now).isPresent()) {
            throw resetRequestLimit();
        }
        long recentRequests = challenges.countByIdentifierAndPurposeAndCreatedAtAfter(
                identifier, "PASSWORD_RESET", now.minus(10, ChronoUnit.MINUTES));
        if (recentRequests >= 3) {
            throw resetRequestLimit();
        }
    }

    private ApiException resetRequestLimit() {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RESET_REQUEST_LIMIT",
                "Too many reset requests. Please try again later.");
    }

    private String canonicalResetIdentifier(User user, String submittedIdentifier) {
        if (normalizeEmail(submittedIdentifier) != null) {
            return normalizeEmail(user.getEmail() == null ? submittedIdentifier : user.getEmail());
        }
        return PhoneNumberNormalizer.normalizeOrOriginal(
                user.getPhone() == null ? submittedIdentifier : user.getPhone());
    }

    private String normalizeResetPhoneIdentifier(String identifier) {
        String normalized = PhoneNumberNormalizer.normalize(identifier);
        return normalized != null ? normalized : identifier.trim().replaceAll("[\\s().-]", "");
    }

    private String randomToken() {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private ApiException invalidResetOtp() {
        return new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "The reset code is invalid or expired.");
    }

    private ApiException resetOtpLocked() {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_TEMPORARILY_BLOCKED",
                "Too many incorrect attempts. Please try again in 15 minutes.");
    }

    private ApiException invalidResetToken() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN",
                "This password reset link or token is invalid or expired.");
    }

    private OtpChallenge createWidgetRegistrationChallenge(User user, String identifier) {
        Instant now = Instant.now();
        challenges.expirePendingByIdentifierAndPurpose(identifier, "REGISTRATION", now);
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(identifier);
        challenge.setPurpose("REGISTRATION");
        challenge.setDeliveryChannel("SMS");
        challenge.setCodeHash(null);
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        return challenges.save(challenge);
    }

    private OtpChallenge createWidgetPasswordResetChallenge(User user, String identifier) {
        Instant now = Instant.now();
        challenges.expirePendingByIdentifierAndPurpose(identifier, "PASSWORD_RESET", now);
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(identifier);
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("SMS");
        challenge.setCodeHash(null);
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        return challenges.save(challenge);
    }

    private boolean isWidgetPasswordReset(OtpChallenge challenge) {
        return "PASSWORD_RESET".equals(challenge.getPurpose())
                && "SMS".equalsIgnoreCase(challenge.getDeliveryChannel())
                && challenge.getCodeHash() == null;
    }

    private OtpChallenge replacementChallenge(OtpChallenge previous, Instant now) {
        OtpChallenge replacement = new OtpChallenge();
        replacement.setUserId(previous.getUserId());
        replacement.setIdentifier(previous.getIdentifier());
        replacement.setPurpose(previous.getPurpose());
        replacement.setDeliveryChannel(previous.getDeliveryChannel());
        replacement.setAttempts(0);
        replacement.setResendCount(previous.getResendCount() + 1);
        replacement.setLastSentAt(now);
        replacement.setExpiresAt(now.plus(10, ChronoUnit.MINUTES));
        return replacement;
    }

    private void requireLatestChallenge(OtpChallenge challenge, Instant now) {
        Optional<OtpChallenge> latest = challenges
                .findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
                        challenge.getIdentifier(), challenge.getPurpose(), now);
        if (latest.isPresent() && !latest.get().getId().equals(challenge.getId())) {
            throw challengeExpired();
        }
    }

    private void requireUnexpiredOtp(OtpChallenge challenge, Instant now) {
        if (challenge.getExpiresAt() == null || !challenge.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "This verification code has expired.");
        }
    }

    private boolean isChallengeVerified(OtpChallenge challenge) {
        return challenges.existsByIdAndVerifiedAtIsNotNull(challenge.getId());
    }

    private ApiException challengeExpired() {
        return new ApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED",
                "This verification request has expired. Request a new code.");
    }

    private ApiException otpInvalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID",
                "The verification code is invalid.");
    }

    private OtpVerificationResponse otpVerified(OtpChallenge challenge) {
        String message = "SMS".equalsIgnoreCase(challenge.getDeliveryChannel())
                ? "Phone verified."
                : "Account verified.";
        return new OtpVerificationResponse(true, "OTP_VERIFIED", message);
    }

    private OtpVerificationResponse otpAlreadyVerified(OtpChallenge challenge) {
        String message = "SMS".equalsIgnoreCase(challenge.getDeliveryChannel())
                ? "Phone verified."
                : "Account verified.";
        return new OtpVerificationResponse(true, "OTP_ALREADY_VERIFIED", message);
    }

    private boolean isWidgetRegistration(OtpChallenge challenge) {
        return "REGISTRATION".equals(challenge.getPurpose())
                && "SMS".equalsIgnoreCase(challenge.getDeliveryChannel());
    }

    private boolean samePhone(String first, String second) {
        return first != null && second != null
                && first.replaceAll("\\D", "").equals(second.replaceAll("\\D", ""));
    }

    private String chooseRegistrationChannel(String requestedChannel, RegistrationOtpOptions options) {
        if (!options.emailOtpEnabled() && !options.mobileOtpEnabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "REGISTRATION_OTP_DISABLED",
                    "Registration is currently unavailable. Please contact the administrator.");
        }
        String channel = requestedChannel == null || requestedChannel.isBlank()
                ? (options.emailOtpEnabled() ? "EMAIL" : "SMS")
                : requestedChannel.trim().toUpperCase(java.util.Locale.ROOT);
        requireRegistrationChannelEnabled(channel, options);
        if ("SMS".equals(channel) && !options.smsConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "OTP_SMS_NOT_CONFIGURED",
                    "Mobile verification is temporarily unavailable. Please contact the administrator.");
        }
        return channel;
    }

    private void requireRegistrationChannelEnabled(String channel, RegistrationOtpOptions options) {
        boolean enabled = "EMAIL".equalsIgnoreCase(channel) ? options.emailOtpEnabled()
                : "SMS".equalsIgnoreCase(channel) && options.mobileOtpEnabled();
        if (!enabled) {
            throw new ApiException(HttpStatus.CONFLICT, "OTP_CHANNEL_DISABLED",
                    "This verification method is no longer available. Choose another enabled method.");
        }
        if ("SMS".equalsIgnoreCase(channel) && !options.smsConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "OTP_SMS_NOT_CONFIGURED",
                    "Mobile verification is temporarily unavailable. Please contact the administrator.");
        }
    }

    private void assertUniqueIdentifiers(String email, String phone, String currentUserId) {
        if (email != null && users.findByEmailIgnoreCaseAndDeletedAtIsNull(email)
                .filter(user -> !user.getId().equals(currentUserId)).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "IDENTIFIER_EXISTS", "An account already exists.");
        }
        if (phone != null && users.findByPhoneAndDeletedAtIsNull(phone)
                .filter(user -> !user.getId().equals(currentUserId)).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "IDENTIFIER_EXISTS", "An account already exists.");
        }
    }

    private void verifyChallenge(OtpChallenge challenge, String otp, boolean maskOtpMismatch) {
        Instant now = Instant.now();
        if (challenge.getVerifiedAt() != null || challenge.getExpiresAt().isBefore(now) || challenge.getAttempts() >= 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }
        if (!MessageDigest.isEqual(hashOtp(otp).getBytes(StandardCharsets.UTF_8),
                challenge.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            challenges.incrementAttempts(challenge.getId(), now);
            throw new ApiException(HttpStatus.BAD_REQUEST, maskOtpMismatch ? "INVALID_CHALLENGE" : "INVALID_OTP",
                    "Invalid or expired challenge.");
        }
        if (challenges.consumeIfValid(challenge.getId(), challenge.getCodeHash(), now) != 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CHALLENGE", "Invalid or expired challenge.");
        }
    }

    private User findUser(String identifier) {
        return findUserByIdentifier(identifier)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials."));
    }

    private String normalizeEmail(String value) {
        return value == null || value.isBlank() || !value.contains("@")
                ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private Optional<User> findUserByIdentifier(String identifier) {
        String email = normalizeEmail(identifier);
        if (email != null) {
            return users.findByEmailIgnoreCaseAndDeletedAtIsNull(email);
        }
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }

        String compact = identifier.trim().replaceAll("[\\s().-]", "");
        String digits = compact.startsWith("+") ? compact.substring(1) : compact;
        List<String> candidates = new ArrayList<>();
        if (digits.matches("[6-9]\\d{9}")) {
            candidates.add("+91" + digits);
            candidates.add("91" + digits);
            candidates.add(digits);
        } else if (digits.matches("91[6-9]\\d{9}")) {
            String nationalNumber = digits.substring(2);
            candidates.add("+91" + nationalNumber);
            candidates.add("91" + nationalNumber);
            candidates.add(nationalNumber);
        } else {
            String normalized = PhoneNumberNormalizer.normalize(identifier);
            if (normalized != null) {
                candidates.add(normalized);
            }
            candidates.add(compact);
            candidates.add(digits);
        }

        for (String candidate : candidates.stream().distinct().toList()) {
            Optional<User> user = users.findByPhoneAndDeletedAtIsNull(candidate);
            if (user.isPresent()) {
                return user;
            }
        }
        return Optional.empty();
    }

    private ApiException invalidCustomerCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                "Invalid email/phone or password");
    }

    private ApiException verificationRequired(User user, String loginIdentifier) {
        boolean noVerifiedContact = user.getPhoneVerifiedAt() == null && user.getEmailVerifiedAt() == null;
        boolean canCompleteRegistration = "PENDING_VERIFICATION".equals(user.getStatus())
                || ("ACTIVE".equals(user.getStatus()) && noVerifiedContact);
        OtpChallenge challenge = canCompleteRegistration
                ? challenges.findFirstByUserIdAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
                        user.getId(), "REGISTRATION").orElse(null)
                : null;
        if (challenge == null && canCompleteRegistration) {
            challenge = createVerificationChallenge(user, loginIdentifier);
        }
        if (challenge == null) {
            return new ApiException(HttpStatus.FORBIDDEN, "NEED_VERIFICATION",
                    "Complete phone or email verification to sign in.");
        }
        if ("ACTIVE".equals(user.getStatus()) && noVerifiedContact) {
            user.setStatus("PENDING_VERIFICATION");
        }
        String channel = challenge.getDeliveryChannel() == null
                ? (challenge.getIdentifier() != null && challenge.getIdentifier().contains("@") ? "EMAIL" : "SMS")
                : challenge.getDeliveryChannel();
        String challengeIdentifier = challenge.getIdentifier() == null
                ? ("EMAIL".equals(channel) ? user.getEmail() : user.getPhone())
                : challenge.getIdentifier();
        return new ApiException(HttpStatus.FORBIDDEN, "NEED_VERIFICATION",
                "Complete phone or email verification to sign in.", List.of(),
                Map.of("challengeId", challenge.getId(),
                        "verificationChannel", channel,
                        "identifier", challengeIdentifier));
    }

    private OtpChallenge createVerificationChallenge(User user, String loginIdentifier) {
        RegistrationOtpOptions options = registrationOtpSettings.current();
        String requestedEmail = normalizeEmail(loginIdentifier);
        boolean preferEmail = requestedEmail != null;
        if ((preferEmail || user.getPhone() == null || user.getPhoneVerifiedAt() != null)
                && user.getEmail() != null && user.getEmailVerifiedAt() == null && options.emailOtpEnabled()) {
            return createChallenge(user, user.getEmail(), "REGISTRATION", "EMAIL");
        }
        if (user.getPhone() != null && user.getPhoneVerifiedAt() == null
                && options.mobileOtpEnabled() && options.smsConfigured()) {
            return createWidgetRegistrationChallenge(user, user.getPhone());
        }
        if (user.getEmail() != null && user.getEmailVerifiedAt() == null && options.emailOtpEnabled()) {
            return createChallenge(user, user.getEmail(), "REGISTRATION", "EMAIL");
        }
        return null;
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
