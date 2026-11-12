package com.dreamspex.order;


import com.dreamspex.auth.entity.Address;
import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DeliveryAvailabilityServiceTest {
    private final StoreRepository stores = mock(StoreRepository.class);
    private final DeliveryAvailabilityService service = new DeliveryAvailabilityService(stores);

    @Test
    void includesCustomerAtExactlyConfiguredRadius() {
        Store store = store("50.00");
        when(stores.findByStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(store));
        Address address = address(0, Math.toDegrees(50 / 6371.0088));

        DeliveryAvailabilityService.Evaluation result = service.evaluate(address);

        assertTrue(result.available());
        assertEquals("AVAILABLE", result.status());
        assertEquals(new BigDecimal("50.00"), result.distanceKm());
        assertEquals(new BigDecimal("50.00"), result.radiusKm());
    }

    @Test
    void rejectsCustomerOutsideConfiguredRadiusAndReflectsRadiusUpdates() {
        Store store = store("50.00");
        when(stores.findByStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(store));
        Address address = address(0, Math.toDegrees(50.1 / 6371.0088));

        assertFalse(service.evaluate(address).available());
        store.setDeliveryRadiusKm(new BigDecimal("51.00"));
        assertTrue(service.evaluate(address).available());
    }

    @Test
    void choosesNearestActiveStoreThatCanServeCustomer() {
        Store closestOutside = store("10.00");
        Store fartherInside = store("100.00");
        fartherInside.setName("Second store");
        fartherInside.setLatitude(BigDecimal.ZERO);
        fartherInside.setLongitude(BigDecimal.valueOf(Math.toDegrees(20 / 6371.0088)));
        when(stores.findByStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(closestOutside, fartherInside));

        DeliveryAvailabilityService.Evaluation result = service.evaluate(address(0, Math.toDegrees(15 / 6371.0088)));

        assertTrue(result.available());
        assertSame(fartherInside, result.store());
    }

    @Test
    void failsClosedWhenStoreCoordinatesOrRadiusAreNotConfigured() {
        Store store = store("100.00");
        store.setLatitude(null);
        store.setLongitude(null);
        when(stores.findByStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(store));

        DeliveryAvailabilityService.Evaluation result = service.evaluate(address(17.385, 78.4867));

        assertFalse(result.available());
        assertEquals("STORE_CONFIGURATION_REQUIRED", result.status());
        assertNull(result.distanceKm());
    }

    @Test
    void requiresCustomerCoordinatesWithoutGuessingFromAddress() {
        DeliveryAvailabilityService.Evaluation result = service.evaluate(new Address());

        assertFalse(result.available());
        assertEquals("LOCATION_REQUIRED", result.status());
        assertNull(result.distanceKm());
        verifyNoInteractions(stores);
    }

    @Test
    void honorsTheCustomerSelectedActiveFranchiseInsteadOfChoosingTheNearestStore() {
        Store selected = store("25.00");
        selected.setFranchiseManaged(true);
        when(stores.findById("selected-franchise")).thenReturn(java.util.Optional.of(selected));

        DeliveryAvailabilityService.Evaluation result = service.evaluate(address(0, 0), "selected-franchise");

        assertTrue(result.available());
        assertSame(selected, result.store());
        verify(stores, never()).findByStatusOrderByNameAsc("ACTIVE");
    }

    @Test
    void rejectsDeliveryFromASelectedFranchiseOutsideItsServiceRadius() {
        Store selected = store("10.00");
        selected.setFranchiseManaged(true);
        when(stores.findById("selected-franchise")).thenReturn(java.util.Optional.of(selected));

        DeliveryAvailabilityService.Evaluation result = service.evaluate(
                address(0, Math.toDegrees(20 / 6371.0088)), "selected-franchise");

        assertFalse(result.available());
        assertEquals("OUTSIDE_DELIVERY_AREA", result.status());
        assertSame(selected, result.store());
    }

    private static Store store(String radiusKm) {
        Store store = new Store();
        store.setName("Test store");
        store.setStatus("ACTIVE");
        store.setLatitude(BigDecimal.ZERO);
        store.setLongitude(BigDecimal.ZERO);
        store.setDeliveryRadiusKm(new BigDecimal(radiusKm));
        return store;
    }

    private static Address address(double latitude, double longitude) {
        Address address = new Address();
        address.setLatitude(BigDecimal.valueOf(latitude));
        address.setLongitude(BigDecimal.valueOf(longitude));
        return address;
    }
}
