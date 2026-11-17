package com.dreamspex.delivery;

import com.dreamspex.admin.StoreRepository;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.ShippingProperties;
import com.dreamspex.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.dreamspex.delivery.DeliveryFeeDtos.PolicyRequest;
import static com.dreamspex.delivery.DeliveryFeeDtos.SlabRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryFeeServiceTest {
    @Mock private DeliveryFeePolicyRepository policyRepository;
    @Mock private DeliveryFeeSlabRepository slabRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private CurrentUser currentUser;
    @Mock private AuditLogService auditLogService;
    @Mock private ShippingProperties shippingProperties;

    private DeliveryFeeService service;
    private final User actor = new User();

    @BeforeEach
    void setUp() {
        service = new DeliveryFeeService(policyRepository, slabRepository, storeRepository, currentUser, auditLogService, shippingProperties);
        lenient().when(currentUser.require(any())).thenReturn(actor);
    }

    @Test
    void zeroFreeDeliveryThresholdUsesTheConfiguredSlabAt380Point72Km() {
        DeliveryFeePolicy policy = policy("0.00");
        DeliveryFeeSlab slab = slab(policy, "slab-100-600", "100-600 km", "100.00", "600.00", "100.00");
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(List.of(slab));

        var quote = service.quote(addressAtDistance(380.72), store(), new BigDecimal("250.00"));

        assertEquals(new BigDecimal("380.72"), quote.distanceKm());
        assertEquals(new BigDecimal("100.00"), quote.appliedFee());
        assertEquals("slab-100-600", quote.slabId());
        assertEquals("100-600 km", quote.slabLabel());
        assertFalse(quote.freeDelivery());
    }

    @Test
    void zeroFreeDeliveryThresholdUsesTheConfiguredSlabAt25Km() {
        DeliveryFeePolicy policy = policy("0.00");
        DeliveryFeeSlab slab = slab(policy, "slab-10-50", "10-50 km", "10.00", "50.00", "35.00");
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(List.of(slab));

        var quote = service.quote(addressAtDistance(25.00), store(), new BigDecimal("250.00"));

        assertEquals(new BigDecimal("35.00"), quote.appliedFee());
        assertEquals("slab-10-50", quote.slabId());
        assertEquals("10-50 km", quote.slabLabel());
        assertFalse(quote.freeDelivery());
    }

    @Test
    void configuredSlabRangesIncludeTheirMinimumAndMaximumBoundaries() {
        DeliveryFeePolicy policy = policy("0.00");
        policy.setMaxDeliveryDistanceKm(new BigDecimal("800.00"));
        List<DeliveryFeeSlab> slabs = List.of(
                slab(policy, "slab-10-30", "10-30 km", "10.00", "30.00", "35.00"),
                slab(policy, "slab-31-800", "31-800 km", "31.00", "800.00", "100.00"));
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(slabs);

        assertQuoteAtDistance(25.00, "35.00", "slab-10-30");
        assertQuoteAtDistance(30.00, "35.00", "slab-10-30");
        assertQuoteAtDistance(31.00, "100.00", "slab-31-800");
        assertQuoteAtDistance(380.72, "100.00", "slab-31-800");
        assertQuoteAtDistance(800.00, "100.00", "slab-31-800");
    }

    @Test
    void decimalDistanceBetweenConfiguredSlabsRemainsUnavailable() {
        DeliveryFeePolicy policy = policy("0.00");
        policy.setMaxDeliveryDistanceKm(new BigDecimal("800.00"));
        List<DeliveryFeeSlab> slabs = List.of(
                slab(policy, "slab-10-30", "10-30 km", "10.00", "30.00", "35.00"),
                slab(policy, "slab-31-800", "31-800 km", "31.00", "800.00", "100.00"));
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(slabs);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.quote(addressAtDistance(30.50), store(), new BigDecimal("250.00")));

        assertEquals("DELIVERY_SLAB_NOT_FOUND", ex.code());
    }

    @Test
    void distanceInAnUnconfiguredGapDoesNotMatchASlab() {
        DeliveryFeePolicy policy = policy("0.00");
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(List.of(
                        slab(policy, "slab-10-50", "10-50 km", "10.00", "50.00", "35.00"),
                        slab(policy, "slab-100-600", "100-600 km", "100.00", "600.00", "100.00")));

        ApiException ex = assertThrows(ApiException.class,
                () -> service.quote(addressAtDistance(75.00), store(), new BigDecimal("250.00")));

        assertEquals("DELIVERY_SLAB_NOT_FOUND", ex.code());
    }

    @Test
    void positiveFreeDeliveryThresholdAppliesOnlyAtOrAboveConfiguredSubtotal() {
        DeliveryFeePolicy policy = policy("250.00");
        DeliveryFeeSlab slab = slab(policy, "slab-10-50", "10-50 km", "10.00", "50.00", "35.00");
        when(policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.STORE, "store-1")).thenReturn(Optional.empty());
        when(policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc(
                "ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE"))
                .thenReturn(List.of(slab));

        var paidQuote = service.quote(addressAtDistance(25.00), store(), new BigDecimal("249.99"));
        var freeQuote = service.quote(addressAtDistance(25.00), store(), new BigDecimal("250.00"));

        assertEquals(new BigDecimal("35.00"), paidQuote.appliedFee());
        assertEquals("slab-10-50", paidQuote.slabId());
        assertFalse(paidQuote.freeDelivery());
        assertEquals(BigDecimal.ZERO, freeQuote.appliedFee());
        assertNull(freeQuote.slabId());
        assertNull(freeQuote.slabLabel());
        assertTrue(freeQuote.freeDelivery());
    }

    @Test
    void updatePolicyPersistsTheSelectedRecordAndKeepsMatchingPolicyId() {
        DeliveryFeePolicy existing = new DeliveryFeePolicy();
        setId(existing, "policy-1");
        existing.setName("Default policy");
        existing.setScope(DeliveryFeePolicy.Scope.GLOBAL);
        existing.setStatus("ACTIVE");
        existing.setFreeDeliveryThreshold(new BigDecimal("250.00"));
        existing.setMaxDeliveryDistanceKm(new BigDecimal("30.00"));
        existing.setUnavailableAreas("Bangalore");
        when(policyRepository.findById("policy-1")).thenReturn(Optional.of(existing));
        when(policyRepository.save(any(DeliveryFeePolicy.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var updated = service.updatePolicy(authentication(), "policy-1",
                new PolicyRequest("Priority city delivery", "GLOBAL", null,
                        new BigDecimal("350.00"), new BigDecimal("45.00"), List.of("Koramangala"), false));

        assertEquals("policy-1", updated.id());
        assertEquals("Priority city delivery", existing.getName());
        assertEquals(new BigDecimal("350.00"), existing.getFreeDeliveryThreshold());
        assertEquals(new BigDecimal("45.00"), existing.getMaxDeliveryDistanceKm());
        assertFalse(updated.active());
        verify(policyRepository).save(existing);
    }

    @Test
    void saveSlabRejectsOverlappingRangesAcrossTheSamePolicy() {
        DeliveryFeePolicy policy = new DeliveryFeePolicy();
        setId(policy, "policy-1");
        policy.setName("Local");
        policy.setScope(DeliveryFeePolicy.Scope.GLOBAL);
        policy.setStatus("ACTIVE");
        policy.setMaxDeliveryDistanceKm(new BigDecimal("30.00"));
        DeliveryFeeSlab current = new DeliveryFeeSlab();
        setId(current, "slab-1");
        current.setPolicy(policy);
        current.setLabel("5-10 km");
        current.setMinDistanceKm(new BigDecimal("5.00"));
        current.setMaxDistanceKm(new BigDecimal("10.00"));
        current.setFeeAmount(new BigDecimal("40.00"));
        current.setStatus("ACTIVE");
        when(policyRepository.findById("policy-1")).thenReturn(Optional.of(policy));
        when(slabRepository.findByPolicyIdOrderByMinDistanceKmAsc("policy-1")).thenReturn(List.of(current));

        ApiException ex = assertThrows(ApiException.class, () -> service.saveSlab(authentication(),
                new SlabRequest("policy-1", "8-12 km", new BigDecimal("8.00"), new BigDecimal("12.00"),
                        new BigDecimal("60.00"), true, 1)));

        assertEquals("OVERLAPPING_DELIVERY_FEE_SLABS", ex.code());
    }

    @Test
    void updateSlabAllowsEditingTheCurrentRangeWithoutFlaggingSelfOverlap() {
        DeliveryFeePolicy policy = new DeliveryFeePolicy();
        setId(policy, "policy-1");
        policy.setName("Local");
        policy.setScope(DeliveryFeePolicy.Scope.GLOBAL);
        policy.setStatus("ACTIVE");
        policy.setMaxDeliveryDistanceKm(new BigDecimal("30.00"));
        DeliveryFeeSlab current = new DeliveryFeeSlab();
        setId(current, "slab-1");
        current.setPolicy(policy);
        current.setLabel("5-10 km");
        current.setMinDistanceKm(new BigDecimal("5.00"));
        current.setMaxDistanceKm(new BigDecimal("10.00"));
        current.setFeeAmount(new BigDecimal("40.00"));
        current.setStatus("ACTIVE");
        when(policyRepository.findById("policy-1")).thenReturn(Optional.of(policy));
        when(slabRepository.findById("slab-1")).thenReturn(Optional.of(current));
        when(slabRepository.findByPolicyIdOrderByMinDistanceKmAsc("policy-1")).thenReturn(List.of(current));
        when(slabRepository.save(any(DeliveryFeeSlab.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var updated = service.updateSlab(authentication(), "slab-1",
                new SlabRequest("policy-1", "5-15 km", new BigDecimal("5.00"), new BigDecimal("15.00"),
                        new BigDecimal("50.00"), true, 1));

        assertEquals("slab-1", updated.id());
        assertEquals(new BigDecimal("15.00"), current.getMaxDistanceKm());
        assertEquals(new BigDecimal("50.00"), current.getFeeAmount());
        verify(slabRepository).save(current);
    }

    private void setId(Object target, String id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Unable to set id for test fixture", ex);
        }
    }

    private DeliveryFeePolicy policy(String threshold) {
        DeliveryFeePolicy policy = new DeliveryFeePolicy();
        setId(policy, "policy-1");
        policy.setName("Delivery policy");
        policy.setScope(DeliveryFeePolicy.Scope.GLOBAL);
        policy.setStatus("ACTIVE");
        policy.setFreeDeliveryThreshold(new BigDecimal(threshold));
        policy.setMaxDeliveryDistanceKm(new BigDecimal("600.00"));
        return policy;
    }

    private void assertQuoteAtDistance(double distanceKm, String expectedFee, String expectedSlabId) {
        var quote = service.quote(addressAtDistance(distanceKm), store(), new BigDecimal("250.00"));

        assertEquals(new BigDecimal(expectedFee), quote.appliedFee());
        assertEquals(expectedSlabId, quote.slabId());
        assertFalse(quote.freeDelivery());
    }

    private DeliveryFeeSlab slab(DeliveryFeePolicy policy, String id, String label, String min, String max, String fee) {
        DeliveryFeeSlab slab = new DeliveryFeeSlab();
        setId(slab, id);
        slab.setPolicy(policy);
        slab.setLabel(label);
        slab.setMinDistanceKm(new BigDecimal(min));
        slab.setMaxDistanceKm(new BigDecimal(max));
        slab.setFeeAmount(new BigDecimal(fee));
        slab.setStatus("ACTIVE");
        return slab;
    }

    private Address addressAtDistance(double distanceKm) {
        Address address = new Address();
        address.setLatitude(BigDecimal.ZERO);
        address.setLongitude(BigDecimal.valueOf(Math.toDegrees(distanceKm / 6371.0088)));
        return address;
    }

    private com.dreamspex.admin.Store store() {
        com.dreamspex.admin.Store store = new com.dreamspex.admin.Store();
        setId(store, "store-1");
        store.setLatitude(BigDecimal.ZERO);
        store.setLongitude(BigDecimal.ZERO);
        return store;
    }

    private UsernamePasswordAuthenticationToken authentication() {
        return new UsernamePasswordAuthenticationToken("admin", "secret");
    }
}
