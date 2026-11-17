package com.dreamspex.delivery;

import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.common.RequestIdFilter;
import com.dreamspex.config.ShippingProperties;
import com.dreamspex.order.DeliveryAvailabilityService;
import com.dreamspex.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static com.dreamspex.delivery.DeliveryFeeDtos.*;

@Service
public class DeliveryFeeService {
    private static final Logger log = LoggerFactory.getLogger(DeliveryFeeService.class);

    private final DeliveryFeePolicyRepository policyRepository;
    private final DeliveryFeeSlabRepository slabRepository;
    private final StoreRepository storeRepository;
    private final CurrentUser currentUser;
    private final AuditLogService auditLogService;
    private final ShippingProperties shippingProperties;

    public DeliveryFeeService(
            DeliveryFeePolicyRepository policyRepository,
            DeliveryFeeSlabRepository slabRepository,
            StoreRepository storeRepository,
            CurrentUser currentUser,
            AuditLogService auditLogService,
            ShippingProperties shippingProperties) {
        this.policyRepository = policyRepository;
        this.slabRepository = slabRepository;
        this.storeRepository = storeRepository;
        this.currentUser = currentUser;
        this.auditLogService = auditLogService;
        this.shippingProperties = shippingProperties;
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> listPolicies() {
        return policyRepository.findAllByOrderByUpdatedAtDesc().stream().map(this::toPolicyResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SlabResponse> listSlabs(String policyId) {
        if (policyId == null || policyId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_POLICY_ID", "A delivery fee policy is required.");
        }
        return slabRepository.findByPolicyIdOrderByMinDistanceKmAsc(policyId).stream().map(this::toSlabResponse).toList();
    }

    @Transactional
    public PolicyResponse savePolicy(org.springframework.security.core.Authentication authentication, PolicyRequest request) {
        User actor = currentUser.require(authentication);
        validatePolicyRequest(request);
        DeliveryFeePolicy policy = findPolicyOrCreate(request.storeId());
        applyPolicyValues(policy, request);
        policy.setUpdatedAt(Instant.now());
        policyRepository.save(policy);
        auditLogService.record(actor, "DELIVERY_FEE_POLICY_SAVED", "DELIVERY_FEE_POLICY", policy.getId());
        return toPolicyResponse(policy);
    }

    @Transactional
    public PolicyResponse updatePolicy(org.springframework.security.core.Authentication authentication, String id, PolicyRequest request) {
        User actor = currentUser.require(authentication);
        validatePolicyRequest(request);
        DeliveryFeePolicy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_POLICY_NOT_FOUND", "Delivery fee policy was not found."));
        applyPolicyValues(policy, request);
        policy.setUpdatedAt(Instant.now());
        policyRepository.save(policy);
        auditLogService.record(actor, "DELIVERY_FEE_POLICY_UPDATED", "DELIVERY_FEE_POLICY", policy.getId());
        return toPolicyResponse(policy);
    }

    @Transactional
    public void deletePolicy(org.springframework.security.core.Authentication authentication, String id) {
        User actor = currentUser.require(authentication);
        DeliveryFeePolicy policy = policyRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_POLICY_NOT_FOUND", "Delivery fee policy was not found."));
        policyRepository.delete(policy);
        auditLogService.record(actor, "DELIVERY_FEE_POLICY_DELETED", "DELIVERY_FEE_POLICY", id);
    }

    @Transactional
    public SlabResponse saveSlab(org.springframework.security.core.Authentication authentication, SlabRequest request) {
        User actor = currentUser.require(authentication);
        DeliveryFeePolicy policy = policyRepository.findById(request.policyId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_POLICY_NOT_FOUND", "Delivery fee policy was not found."));
        validateSlabRequest(policy, request, null);
        DeliveryFeeSlab slab = new DeliveryFeeSlab();
        applySlabValues(slab, policy, request);
        slabRepository.save(slab);
        auditLogService.record(actor, "DELIVERY_FEE_SLAB_SAVED", "DELIVERY_FEE_SLAB", slab.getId());
        return toSlabResponse(slab);
    }

    @Transactional
    public SlabResponse updateSlab(org.springframework.security.core.Authentication authentication, String id, SlabRequest request) {
        User actor = currentUser.require(authentication);
        DeliveryFeeSlab slab = slabRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_SLAB_NOT_FOUND", "Delivery fee slab was not found."));
        DeliveryFeePolicy policy = policyRepository.findById(request.policyId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_POLICY_NOT_FOUND", "Delivery fee policy was not found."));
        validateSlabRequest(policy, request, slab.getId());
        applySlabValues(slab, policy, request);
        slabRepository.save(slab);
        auditLogService.record(actor, "DELIVERY_FEE_SLAB_UPDATED", "DELIVERY_FEE_SLAB", slab.getId());
        return toSlabResponse(slab);
    }

    @Transactional
    public void deleteSlab(org.springframework.security.core.Authentication authentication, String id) {
        User actor = currentUser.require(authentication);
        DeliveryFeeSlab slab = slabRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_FEE_SLAB_NOT_FOUND", "Delivery fee slab was not found."));
        slabRepository.delete(slab);
        auditLogService.record(actor, "DELIVERY_FEE_SLAB_DELETED", "DELIVERY_FEE_SLAB", id);
    }

    @Transactional(readOnly = true)
    public DeliveryFeeQuote quote(Address address, Store store, BigDecimal subtotal) {
        if (address == null || !hasValidCoordinates(address.getLatitude(), address.getLongitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DELIVERY_LOCATION_REQUIRED", "Select a valid delivery location on the map.");
        }
        if (store == null || !hasValidCoordinates(store.getLatitude(), store.getLongitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DELIVERY_STORE_REQUIRED", "A delivery store is required to calculate delivery pricing.");
        }

        BigDecimal distance = BigDecimal.valueOf(DeliveryAvailabilityService.distanceKm(
                address.getLatitude().doubleValue(),
                address.getLongitude().doubleValue(),
                store.getLatitude().doubleValue(),
                store.getLongitude().doubleValue())).setScale(2, java.math.RoundingMode.HALF_UP);
        DeliveryFeePolicy policy = resolvePolicy(store);
        if (policy == null) {
            log.info("Delivery fee quote requestId={} storeId={} policyId=none policyScope=none distanceKm={} result=LEGACY_FALLBACK",
                    requestId(), store.getId(), distance);
            return fallbackQuote(subtotal, distance, null);
        }
        String normalizedArea = normalizeArea(address.getCity()) + ":" + normalizeArea(address.getPostalCode());
        for (String area : parseAreas(policy.getUnavailableAreas())) {
            if (area.equalsIgnoreCase(normalizedArea)
                    || area.equalsIgnoreCase(normalizeArea(address.getCity()))
                    || area.equalsIgnoreCase(normalizeArea(address.getPostalCode()))) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DELIVERY_AREA_UNAVAILABLE", "Delivery is unavailable in the selected area.");
            }
        }

        if (distance.compareTo(policy.getMaxDeliveryDistanceKm()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DELIVERY_OUTSIDE_AREA", "The selected location is beyond the configured maximum delivery distance.");
        }

        BigDecimal threshold = policy.getFreeDeliveryThreshold() == null ? BigDecimal.ZERO : policy.getFreeDeliveryThreshold();
        if (threshold.compareTo(BigDecimal.ZERO) > 0 && subtotal.compareTo(threshold) >= 0) {
            log.info("Delivery fee quote requestId={} storeId={} policyId={} policyScope={} distanceKm={} result=FREE_DELIVERY",
                    requestId(), store.getId(), policy.getId(), policy.getScope(), distance);
            return new DeliveryFeeQuote(subtotal, BigDecimal.ZERO, threshold, distance, policy.getMaxDeliveryDistanceKm(),
                    policy.getId(), policy.getName(), policy.getScope().name(), null, null, true, "FREE_DELIVERY");
        }

        List<DeliveryFeeSlab> slabs = slabRepository.findByPolicyIdAndStatusOrderByMinDistanceKmAsc(policy.getId(), "ACTIVE");
        DeliveryFeeSlab selected = null;
        if (!slabs.isEmpty()) {
            for (DeliveryFeeSlab slab : slabs) {
                BigDecimal min = slab.getMinDistanceKm();
                BigDecimal max = slab.getMaxDistanceKm();
                boolean matches = distance.compareTo(min) >= 0 && (max == null || distance.compareTo(max) <= 0);
                if (matches) {
                    selected = slab;
                    break;
                }
            }
            if (selected == null) {
                log.warn("Delivery fee slab unmatched requestId={} storeId={} policyId={} policyScope={} distanceKm={} activeSlabCount={} activeSlabRanges={}",
                        requestId(), store.getId(), policy.getId(), policy.getScope(), distance, slabs.size(),
                        slabs.stream()
                                .map(slab -> slab.getId() + ":" + slab.getMinDistanceKm() + "-"
                                        + (slab.getMaxDistanceKm() == null ? "unbounded" : slab.getMaxDistanceKm()))
                                .toList());
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DELIVERY_SLAB_NOT_FOUND", "No configured delivery slab matches the selected distance.");
            }
        }

        BigDecimal fee = selected == null ? fallbackQuote(subtotal, distance, policy.getName()).appliedFee() : selected.getFeeAmount();
        log.info("Delivery fee quote requestId={} storeId={} policyId={} policyScope={} distanceKm={} activeSlabCount={} result={} slabId={} appliedFee={}",
                requestId(), store.getId(), policy.getId(), policy.getScope(), distance, slabs.size(),
                selected == null ? "LEGACY_FALLBACK" : "SLAB", selected == null ? "none" : selected.getId(), fee);
        return new DeliveryFeeQuote(subtotal, fee, threshold, distance, policy.getMaxDeliveryDistanceKm(),
                policy.getId(), policy.getName(), policy.getScope().name(), selected == null ? null : selected.getId(),
                selected == null ? null : selected.getLabel(), false, selected == null ? "LEGACY_FALLBACK" : "SLAB");
    }

    private DeliveryFeeQuote fallbackQuote(BigDecimal subtotal, BigDecimal distance, String policyName) {
        BigDecimal threshold = shippingProperties.freeThreshold();
        BigDecimal fee = subtotal.compareTo(threshold) >= 0 ? BigDecimal.ZERO : shippingProperties.charge();
        return new DeliveryFeeQuote(subtotal, fee, threshold, distance, null, null, policyName == null ? "LEGACY_STATIC" : policyName,
                "LEGACY", null, null, subtotal.compareTo(threshold) >= 0, "LEGACY");
    }

    private String requestId() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            Object value = request.getAttribute(RequestIdFilter.REQUEST_ID);
            if (value != null) {
                return value.toString().replaceAll("[^A-Za-z0-9._-]", "_");
            }
        }
        return "unassigned";
    }

    private boolean hasValidCoordinates(BigDecimal latitude, BigDecimal longitude) {
        return latitude != null && longitude != null
                && latitude.compareTo(BigDecimal.valueOf(-90)) >= 0
                && latitude.compareTo(BigDecimal.valueOf(90)) <= 0
                && longitude.compareTo(BigDecimal.valueOf(-180)) >= 0
                && longitude.compareTo(BigDecimal.valueOf(180)) <= 0;
    }

    private DeliveryFeePolicy resolvePolicy(Store store) {
        if (store != null) {
            return policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.STORE, store.getId())
                    .orElseGet(() -> policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)
                            .orElse(null));
        }
        return policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.GLOBAL).orElse(null);
    }

    private DeliveryFeePolicy findPolicyOrCreate(String storeId) {
        if (storeId != null && !storeId.isBlank()) {
            return policyRepository.findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.STORE, storeId)
                    .or(() -> policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.GLOBAL))
                    .orElseGet(DeliveryFeePolicy::new);
        }
        return policyRepository.findFirstByStatusAndScopeOrderByUpdatedAtDesc("ACTIVE", DeliveryFeePolicy.Scope.GLOBAL)
                .orElseGet(DeliveryFeePolicy::new);
    }

    private void validatePolicyRequest(PolicyRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_POLICY", "A delivery fee policy name is required.");
        }
        if (request.freeDeliveryThreshold() == null || request.freeDeliveryThreshold().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_POLICY", "Free delivery threshold cannot be negative.");
        }
        if (request.maxDeliveryDistanceKm() == null || request.maxDeliveryDistanceKm().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_POLICY", "Maximum delivery distance must be greater than zero.");
        }
        if (request.storeId() != null && !request.storeId().isBlank() && (request.scope() == null || !"STORE".equalsIgnoreCase(request.scope()))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_POLICY", "A store-scoped policy requires the scope to be STORE.");
        }
        if (request.scope() != null && "STORE".equalsIgnoreCase(request.scope()) && (request.storeId() == null || request.storeId().isBlank())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_POLICY", "Store-scoped policies require a store selection.");
        }
    }

    private void applyPolicyValues(DeliveryFeePolicy policy, PolicyRequest request) {
        policy.setName(request.name().trim());
        policy.setScope(parseScope(request.scope(), request.storeId()));
        if (request.storeId() != null && !request.storeId().isBlank()) {
            policy.setStore(storeRepository.findById(request.storeId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "STORE_NOT_FOUND", "Store was not found.")));
        } else {
            policy.setStore(null);
        }
        policy.setFreeDeliveryThreshold(request.freeDeliveryThreshold());
        policy.setMaxDeliveryDistanceKm(request.maxDeliveryDistanceKm());
        policy.setUnavailableAreas(csv(request.unavailableAreas()));
        policy.setStatus(request.active() ? "ACTIVE" : "INACTIVE");
    }

    private void applySlabValues(DeliveryFeeSlab slab, DeliveryFeePolicy policy, SlabRequest request) {
        if (request.maxDistanceKm() != null) {
            if (request.maxDistanceKm().compareTo(request.minDistanceKm()) <= 0) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "Maximum distance must be greater than the minimum distance.");
            }
        }
        if (request.minDistanceKm().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "Minimum distance cannot be negative.");
        }
        slab.setPolicy(policy);
        slab.setLabel(request.label().trim());
        slab.setMinDistanceKm(request.minDistanceKm());
        slab.setMaxDistanceKm(request.maxDistanceKm());
        slab.setFeeAmount(request.feeAmount());
        slab.setStatus(request.active() ? "ACTIVE" : "INACTIVE");
        slab.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        slab.setUpdatedAt(Instant.now());
    }

    private void validateSlabRequest(DeliveryFeePolicy policy, SlabRequest request, String excludeId) {
        if (request.label() == null || request.label().isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "A slab label is required.");
        }
        if (request.minDistanceKm() == null || request.minDistanceKm().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "Minimum distance cannot be negative.");
        }
        if (request.feeAmount() == null || request.feeAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "Delivery fee cannot be negative.");
        }
        if (policy.getMaxDeliveryDistanceKm() != null && request.minDistanceKm().compareTo(policy.getMaxDeliveryDistanceKm()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "The minimum distance must not exceed the policy maximum distance.");
        }
        if (request.maxDistanceKm() != null && request.maxDistanceKm().compareTo(policy.getMaxDeliveryDistanceKm()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_FEE_SLAB", "The slab maximum distance exceeds the policy maximum distance." );
        }
        List<DeliveryFeeSlab> existing = slabRepository.findByPolicyIdOrderByMinDistanceKmAsc(policy.getId());
        for (DeliveryFeeSlab current : existing) {
            if (excludeId != null && excludeId.equals(current.getId())) {
                continue;
            }
            if (current.getStatus() == null || !"ACTIVE".equals(current.getStatus())) {
                continue;
            }
            BigDecimal currentMin = current.getMinDistanceKm();
            BigDecimal currentMax = current.getMaxDistanceKm() == null ? policy.getMaxDeliveryDistanceKm() : current.getMaxDistanceKm();
            BigDecimal candidateMin = request.minDistanceKm();
            BigDecimal candidateMax = request.maxDistanceKm() == null ? policy.getMaxDeliveryDistanceKm() : request.maxDistanceKm();
            boolean overlaps = candidateMin.compareTo(currentMax) < 0 && candidateMax.compareTo(currentMin) > 0;
            if (overlaps) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OVERLAPPING_DELIVERY_FEE_SLABS", "Delivery fee slabs cannot overlap.");
            }
        }
    }

    private PolicyResponse toPolicyResponse(DeliveryFeePolicy policy) {
        return new PolicyResponse(
                policy.getId(),
                policy.getName(),
                policy.getScope() == null ? "GLOBAL" : policy.getScope().name(),
                policy.getStoreId(),
                policy.getStore() == null ? null : policy.getStore().getName(),
                policy.getFreeDeliveryThreshold(),
                policy.getMaxDeliveryDistanceKm(),
                parseAreas(policy.getUnavailableAreas()),
                "ACTIVE".equalsIgnoreCase(policy.getStatus()),
                policy.getCreatedAt(),
                policy.getUpdatedAt());
    }

    private SlabResponse toSlabResponse(DeliveryFeeSlab slab) {
        return new SlabResponse(
                slab.getId(),
                slab.getPolicy() == null ? null : slab.getPolicy().getId(),
                slab.getLabel(),
                slab.getMinDistanceKm(),
                slab.getMaxDistanceKm(),
                slab.getFeeAmount(),
                "ACTIVE".equalsIgnoreCase(slab.getStatus()),
                slab.getSortOrder(),
                slab.getCreatedAt(),
                slab.getUpdatedAt());
    }

    private String normalizeArea(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", "").toLowerCase();
    }

    private String csv(List<String> values) {
        if (values == null || values.isEmpty()) return null;
        return values.stream().filter(item -> item != null && !item.isBlank()).map(String::trim).distinct().collect(Collectors.joining(","));
    }

    private List<String> parseAreas(String csvValue) {
        if (csvValue == null || csvValue.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csvValue.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private DeliveryFeePolicy.Scope parseScope(String value, String storeId) {
        if (value != null && "STORE".equalsIgnoreCase(value)) {
            return DeliveryFeePolicy.Scope.STORE;
        }
        if (storeId != null && !storeId.isBlank()) {
            return DeliveryFeePolicy.Scope.STORE;
        }
        return DeliveryFeePolicy.Scope.GLOBAL;
    }

    public record DeliveryFeeQuote(
            BigDecimal subtotal,
            BigDecimal appliedFee,
            BigDecimal freeDeliveryThreshold,
            BigDecimal distanceKm,
            BigDecimal maxDistanceKm,
            String policyId,
            String policyName,
            String policyScope,
            String slabId,
            String slabLabel,
            boolean freeDelivery,
            String calculationType) {
    }
}
