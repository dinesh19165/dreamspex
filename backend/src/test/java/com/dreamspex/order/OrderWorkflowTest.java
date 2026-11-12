package com.dreamspex.order;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderWorkflowTest {
    @Test
    void homeDeliveryUsesOnlyDeliveryStages() {
        assertEquals(java.util.List.of("PROCESSING", "CANCELLED"),
                OrderWorkflow.nextStatuses("PAID", "HOME_DELIVERY"));
        assertEquals(java.util.List.of("SHIPPED", "CANCELLED"),
                OrderWorkflow.nextStatuses("PROCESSING", "HOME_DELIVERY"));
        assertEquals(java.util.List.of("DELIVERED"), OrderWorkflow.nextStatuses("SHIPPED", "DELIVERY"));
        assertFalse(OrderWorkflow.canTransition("PROCESSING", "READY_FOR_PICKUP", "HOME_DELIVERY"));
        assertFalse(OrderWorkflow.canTransition("SHIPPED", "PICKED_UP", "DELIVERY"));
    }

    @Test
    void storePickupRequiresReadyBeforePickupAndNeverUsesDeliveryStages() {
        assertEquals(java.util.List.of("READY_FOR_PICKUP", "CANCELLED"),
                OrderWorkflow.nextStatuses("PROCESSING", "STORE_PICKUP"));
        assertEquals(java.util.List.of("PICKED_UP", "CANCELLED"),
                OrderWorkflow.nextStatuses("READY_FOR_PICKUP", "PICKUP"));
        assertTrue(OrderWorkflow.canTransition("READY_FOR_PICKUP", "PICKED_UP", "STORE_PICKUP"));
        assertFalse(OrderWorkflow.canTransition("PROCESSING", "PICKED_UP", "STORE_PICKUP"));
        assertFalse(OrderWorkflow.canTransition("PROCESSING", "SHIPPED", "STORE_PICKUP"));
        assertFalse(OrderWorkflow.canTransition("SHIPPED", "DELIVERED", "STORE_PICKUP"));
    }
}
