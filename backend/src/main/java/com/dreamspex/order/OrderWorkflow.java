package com.dreamspex.order;

import java.util.List;

public final class OrderWorkflow {
    private OrderWorkflow() {}

    public static boolean isPickup(String fulfillmentType) {
        return "PICKUP".equals(fulfillmentType) || "STORE_PICKUP".equals(fulfillmentType);
    }

    public static List<String> nextStatuses(String status, String fulfillmentType) {
        boolean pickup = isPickup(fulfillmentType);
        return switch (status) {
            case "PENDING_PAYMENT" -> List.of("CANCELLED");
            case "PAID" -> List.of("PROCESSING", "CANCELLED");
            case "PROCESSING" -> pickup
                    ? List.of("READY_FOR_PICKUP", "CANCELLED")
                    : List.of("SHIPPED", "CANCELLED");
            case "READY_FOR_PICKUP" -> pickup ? List.of("PICKED_UP", "CANCELLED") : List.of();
            case "SHIPPED" -> pickup ? List.of() : List.of("DELIVERED");
            default -> List.of();
        };
    }

    public static boolean canTransition(String status, String nextStatus, String fulfillmentType) {
        return nextStatuses(status, fulfillmentType).contains(nextStatus);
    }
}
