package com.dreamspex.membership;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.payment.PaymentProperties;
import com.dreamspex.payment.RazorpayGateway;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.membership.MembershipDtos.PaymentVerificationRequest;
import com.dreamspex.membership.MembershipDtos.PaymentStatusRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static com.dreamspex.prescription.PrescriptionDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MembershipServiceTest {
    @Mock CurrentUser current;
    @Mock MembershipPlanRepository plans;
    @Mock MembershipRepository memberships;
    @Mock MembershipPaymentRepository payments;
    @Mock NotificationService notifications;
    @Mock RazorpayGateway razorpay;

    @Test
    void planPerksRoundTripAsJson() {
        when(plans.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PlanResponse response = service().savePlan(null, new PlanRequest("Gold", "Benefits",
                BigDecimal.TEN, 30, List.of("Discount"), "ACTIVE", new BigDecimal("10.00"), true));

        assertEquals("Gold", response.name());
        assertEquals(List.of("Discount"), response.perks());
        assertEquals(new BigDecimal("10.00"), response.discountPercentage());
        assertTrue(response.recommended());
    }

    @Test
    void directActivationIsRejectedWithoutCreatingMembership() {
        User user = new User();
        when(current.require(any())).thenReturn(user);

        ApiException error = assertThrows(ApiException.class,
                () -> service().activate(auth(), "plan-1"));

        assertEquals("PAYMENT_REQUIRED", error.code());
        verifyNoInteractions(memberships, notifications);
    }

    @Test
    void paymentIntentUsesConfiguredPlanPrice() {
        User user = new User();
        MembershipPlan plan = plan();
        when(current.require(any())).thenReturn(user);
        when(plans.findById(plan.getId())).thenReturn(Optional.of(plan));
        when(razorpay.createOrder(any(), eq(plan.getPrice()), eq("INR"))).thenReturn("order_1");
        when(payments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service().createPaymentIntent(auth(), plan.getId());

        assertEquals("order_1", response.providerOrderId());
        assertEquals(plan.getPrice(), response.amount());
        verify(razorpay).createOrder(any(), eq(plan.getPrice()), eq("INR"));
    }

    @Test
    void verifiedCapturedPaymentActivatesMembership() throws Exception {
        User user = new User();
        MembershipPlan plan = plan();
        MembershipPayment payment = payment(user, plan);
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1"))
                .thenReturn(Optional.of(payment));
        when(payments.findByProviderAndProviderPaymentId("RAZORPAY_TEST", "pay_1"))
                .thenReturn(Optional.empty());
        when(razorpay.fetchPayment("pay_1"))
                .thenReturn(new RazorpayGateway.RazorpayPayment("order_1", 1099, "INR", "captured"));
        when(memberships.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(payments.save(payment)).thenReturn(payment);

        MembershipResponse response = service().verifyPayment(auth(), plan.getId(),
                new PaymentVerificationRequest("order_1", "pay_1", signature("order_1|pay_1")));

        assertEquals(plan.getId(), response.planId());
        assertEquals("ACTIVE", response.status());
        assertEquals("CAPTURED", payment.getStatus());
        assertTrue(payment.isSignatureVerified());
        assertNotNull(payment.getMembership());
        verify(memberships).save(any(Membership.class));
        verify(notifications).create(user, "MEMBERSHIP_ACTIVATED", "Membership activated",
                "Your Gold membership is active.");
    }

    @Test
    void forgedSignatureIsRejectedWithoutFetchingPayment() {
        User user = new User();
        MembershipPlan plan = plan();
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1"))
                .thenReturn(Optional.of(payment(user, plan)));

        ApiException error = assertThrows(ApiException.class,
                () -> service().verifyPayment(auth(), plan.getId(),
                        new PaymentVerificationRequest("order_1", "pay_1", "forged")));

        assertEquals("INVALID_PAYMENT_SIGNATURE", error.code());
        verifyNoInteractions(razorpay);
        verify(memberships, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"authorized", "created", "failed", "cancelled"})
    void nonCapturedPaymentCannotActivateMembership(String providerStatus) throws Exception {
        User user = new User();
        MembershipPlan plan = plan();
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1"))
                .thenReturn(Optional.of(payment(user, plan)));
        when(payments.findByProviderAndProviderPaymentId("RAZORPAY_TEST", "pay_1"))
                .thenReturn(Optional.empty());
        when(razorpay.fetchPayment("pay_1"))
                .thenReturn(new RazorpayGateway.RazorpayPayment("order_1", 1099, "INR", providerStatus));

        ApiException error = assertThrows(ApiException.class,
                () -> service().verifyPayment(auth(), plan.getId(),
                        new PaymentVerificationRequest("order_1", "pay_1", signature("order_1|pay_1"))));

        assertEquals("PAYMENT_NOT_CAPTURED", error.code());
        verify(memberships, never()).save(any());
        verify(payments, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"FAILED", "CANCELLED"})
    void failedOrCancelledPaymentIsRecordedWithoutActivation(String status) {
        User user = new User();
        MembershipPlan plan = plan();
        MembershipPayment payment = payment(user, plan);
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1"))
                .thenReturn(Optional.of(payment));
        when(payments.save(payment)).thenReturn(payment);

        var response = service().updatePaymentStatus(auth(), plan.getId(),
                new PaymentStatusRequest("order_1", status));

        assertEquals(status, response.status());
        assertEquals(status, payment.getStatus());
        verify(memberships, never()).save(any());
    }

    @Test
    void duplicateSuccessfulVerificationReturnsExistingMembership() throws Exception {
        User user = new User();
        MembershipPlan plan = plan();
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setPlan(plan);
        membership.setStartsAt(java.time.Instant.now());
        membership.setExpiresAt(java.time.Instant.now().plusSeconds(86400));
        MembershipPayment payment = payment(user, plan);
        payment.setProviderPaymentId("pay_1");
        payment.setSignatureVerified(true);
        payment.setStatus("CAPTURED");
        payment.setMembership(membership);
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1"))
                .thenReturn(Optional.of(payment));

        MembershipResponse response = service().verifyPayment(auth(), plan.getId(),
                new PaymentVerificationRequest("order_1", "pay_1", "already-verified"));

        assertEquals(membership.getId(), response.id());
        verifyNoInteractions(razorpay);
        verify(memberships, never()).save(any());
        verify(notifications, never()).create(any(), any(), any(), any());
    }

    @Test
    void expiryJobMarksMembershipExpired() {
        User user = new User();
        MembershipPlan plan = plan();
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setPlan(plan);
        membership.setStartsAt(java.time.Instant.now().minusSeconds(86400));
        membership.setExpiresAt(java.time.Instant.now().minusSeconds(60));
        when(memberships.findByStatusAndExpiresAtBefore(eq("ACTIVE"), any()))
                .thenReturn(List.of(membership));

        service().expireMemberships();

        assertEquals("EXPIRED", membership.getStatus());
        verify(notifications).create(user, "MEMBERSHIP_EXPIRED", "Membership expired",
                "Your membership has expired.");
    }

    private MembershipService service() {
        return new MembershipService(current, plans, memberships, payments, notifications,
                new ObjectMapper(), new PaymentProperties("RAZORPAY_TEST", "key", "secret", "webhook-secret"),
                razorpay);
    }

    private UsernamePasswordAuthenticationToken auth() {
        return new UsernamePasswordAuthenticationToken("customer", null);
    }

    private MembershipPlan plan() {
        MembershipPlan plan = new MembershipPlan();
        plan.setName("Gold");
        plan.setDescription("Benefits");
        plan.setPrice(new BigDecimal("10.99"));
        plan.setDurationDays(30);
        plan.setStatus("ACTIVE");
        return plan;
    }

    private MembershipPayment payment(User user, MembershipPlan plan) {
        MembershipPayment payment = new MembershipPayment();
        payment.setUser(user);
        payment.setPlan(plan);
        payment.setProvider("RAZORPAY_TEST");
        payment.setProviderOrderId("order_1");
        payment.setAmount(new BigDecimal("10.99"));
        return payment;
    }

    private String signature(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }
}
