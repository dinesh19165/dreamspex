package com.dreamspex.order;


import com.dreamspex.auth.entity.Address;
import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class DeliveryAvailabilityService {
    private static final double EARTH_RADIUS_KM = 6371.0088;
    private static final double BOUNDARY_TOLERANCE_KM = 1e-9;

    private final StoreRepository stores;

    public DeliveryAvailabilityService(StoreRepository stores) {
        this.stores = stores;
    }

    public Evaluation evaluate(Address address) {
        if (address.getLatitude() == null || address.getLongitude() == null
                || address.getLatitude().doubleValue() < -90 || address.getLatitude().doubleValue() > 90
                || address.getLongitude().doubleValue() < -180 || address.getLongitude().doubleValue() > 180) {
            return unavailable("LOCATION_REQUIRED", null, null, null,
                    "Select a valid delivery location on the map to check availability.");
        }

        List<StoreDistance> configured = stores.findByStatusOrderByNameAsc("ACTIVE").stream()
                .filter(DeliveryAvailabilityService::hasValidConfiguration)
                .map(store -> new StoreDistance(store, distanceKm(
                        address.getLatitude().doubleValue(), address.getLongitude().doubleValue(),
                        store.getLatitude().doubleValue(), store.getLongitude().doubleValue())))
                .toList();
        if (configured.isEmpty()) {
            return unavailable("STORE_CONFIGURATION_REQUIRED", null, null, null,
                    "Delivery locations have not been configured yet. Please contact support.");
        }

        Optional<StoreDistance> serving = configured.stream()
                .filter(item -> item.distanceKm() <= item.store().getDeliveryRadiusKm().doubleValue()
                        + BOUNDARY_TOLERANCE_KM)
                .min(Comparator.comparingDouble(StoreDistance::distanceKm));
        StoreDistance selected = serving.orElseGet(() -> configured.stream()
                .min(Comparator.comparingDouble(StoreDistance::distanceKm)).orElseThrow());
        BigDecimal displayDistance = BigDecimal.valueOf(selected.distanceKm()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal radius = selected.store().getDeliveryRadiusKm();
        if (serving.isPresent()) {
            return new Evaluation(true, "AVAILABLE", selected.store(), displayDistance, radius,
                    "Delivery available — Store distance: " + displayDistance.toPlainString()
                            + " km. Straight-line distance, not road distance.");
        }
        return unavailable("OUTSIDE_DELIVERY_AREA", selected.store(), displayDistance, radius,
                "Sorry, this location is outside our delivery area.");
    }

    public static double distanceKm(double latitude1, double longitude1, double latitude2, double longitude2) {
        double lat1 = Math.toRadians(latitude1);
        double lat2 = Math.toRadians(latitude2);
        double deltaLatitude = Math.toRadians(latitude2 - latitude1);
        double deltaLongitude = Math.toRadians(longitude2 - longitude1);
        double a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
        return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static boolean hasValidConfiguration(Store store) {
        return store.getLatitude() != null && store.getLongitude() != null && store.getDeliveryRadiusKm() != null
                && store.getLatitude().doubleValue() >= -90 && store.getLatitude().doubleValue() <= 90
                && store.getLongitude().doubleValue() >= -180 && store.getLongitude().doubleValue() <= 180
                && store.getDeliveryRadiusKm().signum() > 0;
    }

    private static Evaluation unavailable(String status, Store store, BigDecimal distance, BigDecimal radius,
            String message) {
        return new Evaluation(false, status, store, distance, radius, message);
    }

    public record Evaluation(boolean available, String status, Store store, BigDecimal distanceKm,
            BigDecimal radiusKm, String message) {}

    private record StoreDistance(Store store, double distanceKm) {}
}
