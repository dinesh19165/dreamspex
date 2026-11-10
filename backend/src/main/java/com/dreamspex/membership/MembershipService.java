package com.dreamspex.membership;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.payment.PaymentProperties;
import com.dreamspex.payment.RazorpayGateway;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.membership.MembershipDtos.*;
import static com.dreamspex.prescription.PrescriptionDtos.*;

@Service
public class MembershipService {
    private final CurrentUser current;
    private final MembershipPlanRepository plans;
    private final MembershipRepository memberships;
    private final MembershipPaymentRepository payments;
    private final NotificationService notifications;
    private final ObjectMapper mapper;
    private final PaymentProperties paymentProperties;
    private final RazorpayGateway razorpay;

    public MembershipService(
            CurrentUser current,
            MembershipPlanRepository plans,
            MembershipRepository memberships,
            MembershipPaymentRepository payments,
            NotificationService notifications,
            ObjectMapper mapper,
            PaymentProperties paymentProperties,
            RazorpayGateway razorpay) {
        this.current = current;
        this.plans = plans;
        this.memberships = memberships;
        this.payments = payments;
        this.notifications = notifications;
        this.mapper = mapper;
        this.paymentProperties = paymentProperties;
        this.razorpay = razorpay;
    }

    @Transactional(readOnly = true)
    public List<PlanResponse> publicPlans() {
        return plans.findByStatusOrderByPriceAsc("ACTIVE").stream().map(this::planResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PlanResponse> adminPlans() {
        return plans.findAll().stream().map(this::planResponse).toList();
    }

    @Transactional(readOnly = true)
    public MembershipDashboardResponse customerDashboard(Authentication authentication) {
        User user = current.require(authentication);
        Instant now = Instant.now();
        List<Membership> history = memberships.findByUserIdOrderByStartsAtDesc(user.getId());
        List<MembershipPayment> paymentHistory = payments.findByUserIdOrderByCreatedAtDesc(user.getId());
        MembershipOverview currentMembership = history.stream()
                .filter(membership -> "ACTIVE".equals(membership.getStatus())
                        && membership.getStartsAt().isBefore(now)
                        && membership.getExpiresAt().isAfter(now))
                .findFirst()
                .map(membership -> overview(membership, "ACTIVE"))
                .orElseGet(() -> paymentHistory.stream()
                        .filter(payment -> "PENDING".equals(payment.getStatus()))
                        .findFirst()
                        .map(payment -> overview(payment))
                        .orElseGet(() -> history.stream()
                                .filter(membership -> !membership.getExpiresAt().isAfter(now))
                                .findFirst()
                                .map(membership -> overview(membership, "EXPIRED"))
                                .orElse(null)));
        return new MembershipDashboardResponse(
                currentMembership,
                history.stream().map(membership -> overview(membership, effectiveStatus(membership, now))).toList(),
                paymentHistory.stream().map(this::paymentHistory).toList());
    }

    @Transactional(readOnly = true)
    public List<AdminMembershipResponse> adminMemberships() {
        Instant now = Instant.now();
        java.util.Map<String, MembershipPayment> paymentByMembershipId = payments.findAllByOrderByCreatedAtDesc().stream()
                .filter(payment -> payment.getMembership() != null)
                .collect(java.util.stream.Collectors.toMap(
                        payment -> payment.getMembership().getId(),
                        payment -> payment,
                        (first, ignored) -> first));
        return memberships.findAllByOrderByCreatedAtDesc().stream()
                .map(membership -> {
                    MembershipPayment payment = paymentByMembershipId.get(membership.getId());
                    return new AdminMembershipResponse(
                            membership.getId(),
                            membership.getUser().getId(),
                            membership.getUser().getDisplayName(),
                            membership.getUser().getEmail(),
                            membership.getUser().getPhone(),
                            membership.getPlan().getId(),
                            membership.getPlan().getName(),
                            membership.getPlan().getPrice(),
                            membership.getPlan().getDiscountPercentage(),
                            effectiveStatus(membership, now),
                            membership.getCreatedAt(),
                            membership.getStartsAt(),
                            membership.getExpiresAt(),
                            payment == null ? "UNKNOWN" : payment.getStatus(),
                            payment == null ? null : payment.getProviderPaymentId() == null
                                    ? payment.getId() : payment.getProviderPaymentId());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminMembershipPaymentResponse> adminPaymentHistory() {
        return payments.findAllByOrderByCreatedAtDesc().stream()
                .map(payment -> new AdminMembershipPaymentResponse(
                        payment.getId(),
                        payment.getUser().getId(),
                        payment.getUser().getDisplayName(),
                        payment.getUser().getEmail(),
                        payment.getPlan().getName(),
                        payment.getProvider(),
                        payment.getAmount(),
                        payment.getCurrency(),
                        payment.getStatus(),
                        payment.getCreatedAt()))
                .toList();
    }

    @Transactional
    public PlanResponse savePlan(String id, PlanRequest request) {
        String status = request.status() == null ? "ACTIVE" : request.status().trim().toUpperCase(java.util.Locale.ROOT);
        if (!List.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PLAN_STATUS",
                    "Membership plan status must be Active or Inactive.");
        }
        MembershipPlan plan = id == null
                ? new MembershipPlan()
                : plans.findById(id).orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND", "Membership plan was not found."));
        plan.setName(request.name().trim());
        plan.setDescription(request.description().trim());
        plan.setPrice(request.price());
        plan.setDurationDays(request.durationDays());
        plan.setDiscountPercentage(request.discountPercentage());
        plan.setRecommended(request.recommended());
        plan.setStatus(status);
        try {
            plan.setPerks(mapper.writeValueAsString(request.perks() == null ? List.of() : request.perks()));
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PERKS", "Membership perks are invalid.");
        }
        if (request.recommended()) {
            plans.findAll().stream()
                    .filter(existing -> !existing.getId().equals(plan.getId()) && existing.isRecommended())
                    .forEach(existing -> {
                        existing.setRecommended(false);
                        plans.save(existing);
                    });
        }
        return planResponse(plans.save(plan));
    }

    @Transactional
    public void deletePlan(String id) {
        MembershipPlan plan = plans.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND", "Membership plan was not found."));
        plan.setStatus("INACTIVE");
        plans.save(plan);
    }

    @Transactional
    public PaymentIntentResponse createPaymentIntent(Authentication authentication, String planId) {
        User user = current.require(authentication);
        MembershipPlan plan = plans.findById(planId)
                .filter(candidate -> "ACTIVE".equals(candidate.getStatus()))
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND", "Membership plan was not found."));
        if (plan.getPrice().signum() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "PLAN_PRICE_INVALID",
                    "Membership checkout requires a configured price greater than zero.");
        }
        MembershipPayment payment = new MembershipPayment();
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setProvider(paymentProperties.provider());
        payment.setAmount(plan.getPrice());
        payment.setCurrency("INR");
        payment.setStatus("PENDING");
        payment.setProviderOrderId(razorpay.createOrder(payment.getId(), plan.getPrice(), payment.getCurrency()));
        MembershipPayment saved = payments.save(payment);
        return paymentIntentResponse(saved);
    }

    @Transactional
    public MembershipResponse verifyPayment(
            Authentication authentication,
            String planId,
            PaymentVerificationRequest request) {
        User user = current.require(authentication);
        MembershipPayment payment = payments
                .findByProviderAndProviderOrderId(paymentProperties.provider(), request.providerOrderId())
                .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                .filter(candidate -> candidate.getPlan().getId().equals(planId))
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Membership payment was not found."));

        if ("CAPTURED".equals(payment.getStatus())) {
            if (!request.providerPaymentId().equals(payment.getProviderPaymentId())) {
                throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_VERIFIED",
                        "Membership payment has already been verified.");
            }
            if (payment.getMembership() == null) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "MEMBERSHIP_PAYMENT_INCOMPLETE",
                        "The verified payment has no membership record.");
            }
            return membershipResponse(payment.getMembership());
        }

        String secret = paymentProperties.keySecret();
        if (secret == null || secret.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED",
                    "Razorpay credentials are not configured.");
        }
        if (!constantTime(request.signature(),
                sign(request.providerOrderId() + "|" + request.providerPaymentId(), secret))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PAYMENT_SIGNATURE", "Payment signature is invalid.");
        }
        if (payments.findByProviderAndProviderPaymentId(paymentProperties.provider(), request.providerPaymentId())
                .isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_USED", "Payment has already been used.");
        }

        RazorpayGateway.RazorpayPayment verified = razorpay.fetchPayment(request.providerPaymentId());
        if (!request.providerOrderId().equals(verified.orderId())
                || verified.amount() != payment.getAmount().movePointRight(2).longValueExact()
                || !"INR".equalsIgnoreCase(verified.currency())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_MISMATCH",
                    "Payment details do not match the membership plan.");
        }
        if (!"captured".equalsIgnoreCase(verified.status())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_NOT_CAPTURED",
                    "Membership can only be activated after a captured payment.");
        }

        payment.setProviderPaymentId(request.providerPaymentId());
        payment.setSignatureVerified(true);
        payment.setStatus("CAPTURED");
        Membership membership = activatePaidMembership(user, payment.getPlan());
        payment.setMembership(membership);
        payments.save(payment);
        return membershipResponse(membership);
    }

    @Transactional
    public PaymentIntentResponse updatePaymentStatus(
            Authentication authentication,
            String planId,
            PaymentStatusRequest request) {
        User user = current.require(authentication);
        MembershipPayment payment = payments
                .findByProviderAndProviderOrderId(paymentProperties.provider(), request.providerOrderId())
                .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                .filter(candidate -> candidate.getPlan().getId().equals(planId))
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Membership payment was not found."));
        if ("CAPTURED".equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_VERIFIED",
                    "A verified membership payment cannot be marked failed or cancelled.");
        }
        payment.setStatus(request.status());
        return paymentIntentResponse(payments.save(payment));
    }

    @Transactional
    public MembershipResponse activate(Authentication authentication, String planId) {
        current.require(authentication);
        throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_REQUIRED",
                "Membership can only be activated after verified payment.");
    }

    @Transactional
    public MembershipResponse current(Authentication authentication) {
        User user = current.require(authentication);
        Membership membership = memberships.findFirstByUserIdAndStatusOrderByExpiresAtDesc(user.getId(), "ACTIVE")
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMBERSHIP_NOT_FOUND",
                        "No active membership was found."));
        if (!membership.getExpiresAt().isAfter(Instant.now())) {
            membership.setStatus("EXPIRED");
            memberships.save(membership);
            notifications.create(user, "MEMBERSHIP_EXPIRED", "Membership expired",
                    "Your membership has expired.");
            throw new ApiException(HttpStatus.NOT_FOUND, "MEMBERSHIP_NOT_FOUND",
                    "No active membership was found.");
        }
        return membershipResponse(membership);
    }

    @Scheduled(fixedDelayString = "${DREAMSPEX_MEMBERSHIP_EXPIRY_POLL_MS:3600000}")
    @Transactional
    public void expireMemberships() {
        Instant now = Instant.now();
        memberships.findByStatusAndExpiresAtBefore("ACTIVE", now).forEach(membership -> {
            membership.setStatus("EXPIRED");
            memberships.save(membership);
            notifications.create(membership.getUser(), "MEMBERSHIP_EXPIRED", "Membership expired",
                    "Your membership has expired.");
        });
    }

    private Membership activatePaidMembership(User user, MembershipPlan plan) {
        memberships.findFirstByUserIdAndStatusOrderByExpiresAtDesc(user.getId(), "ACTIVE").ifPresent(old -> {
            old.setStatus("EXPIRED");
            memberships.save(old);
        });
        Instant starts = Instant.now();
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setPlan(plan);
        membership.setStartsAt(starts);
        membership.setExpiresAt(starts.plus(plan.getDurationDays(), java.time.temporal.ChronoUnit.DAYS));
        Membership saved = memberships.save(membership);
        notifications.create(user, "MEMBERSHIP_ACTIVATED", "Membership activated",
                "Your " + plan.getName() + " membership is active.");
        return saved;
    }

    private PlanResponse planResponse(MembershipPlan plan) {
        try {
            return new PlanResponse(plan.getId(), plan.getName(), plan.getDescription(), plan.getPrice(),
                    plan.getDurationDays(), mapper.readValue(plan.getPerks(), new TypeReference<>() {}),
                    plan.getStatus(), plan.getDiscountPercentage(), plan.isRecommended());
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INVALID_PLAN_PERKS",
                    "Membership plan benefits could not be loaded.");
        }
    }

    private MembershipOverview overview(Membership membership, String status) {
        return new MembershipOverview(
                membership.getId(),
                membership.getPlan().getId(),
                membership.getPlan().getName(),
                status,
                membership.getPlan().getDiscountPercentage(),
                planPerks(membership.getPlan()),
                membership.getCreatedAt(),
                membership.getStartsAt(),
                membership.getExpiresAt());
    }

    private MembershipOverview overview(MembershipPayment payment) {
        return new MembershipOverview(
                payment.getId(),
                payment.getPlan().getId(),
                payment.getPlan().getName(),
                "PENDING",
                payment.getPlan().getDiscountPercentage(),
                planPerks(payment.getPlan()),
                payment.getCreatedAt(),
                null,
                null);
    }

    private MembershipPaymentHistory paymentHistory(MembershipPayment payment) {
        return new MembershipPaymentHistory(
                payment.getId(),
                payment.getPlan().getName(),
                payment.getProvider(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getCreatedAt());
    }

    private List<String> planPerks(MembershipPlan plan) {
        try {
            return mapper.readValue(plan.getPerks(), new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INVALID_PLAN_PERKS",
                    "Membership plan benefits could not be loaded.");
        }
    }

    private String effectiveStatus(Membership membership, Instant now) {
        if ("EXPIRED".equals(membership.getStatus())) return "EXPIRED";
        if (!"ACTIVE".equals(membership.getStatus())) return membership.getStatus();
        if (membership.getStartsAt().isAfter(now)) return "PENDING";
        return membership.getExpiresAt().isAfter(now) ? "ACTIVE" : "EXPIRED";
    }

    private PaymentIntentResponse paymentIntentResponse(MembershipPayment payment) {
        return new PaymentIntentResponse(payment.getId(), payment.getProvider(), payment.getProviderOrderId(),
                payment.getStatus(), payment.getAmount(), payment.getCurrency(), payment.isSignatureVerified(),
                paymentProperties.keyId());
    }

    private MembershipResponse membershipResponse(Membership membership) {
        return new MembershipResponse(membership.getId(), membership.getPlan().getId(),
                membership.getPlan().getName(), membership.getStatus(), membership.getStartsAt(),
                membership.getExpiresAt());
    }

    private String sign(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Payment signing is unavailable.", exception);
        }
    }

    private boolean constantTime(String left, String right) {
        return left != null && MessageDigest.isEqual(
                left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }
}
