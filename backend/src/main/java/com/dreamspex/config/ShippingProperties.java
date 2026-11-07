package com.dreamspex.config;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dreamspex.shipping")
public record ShippingProperties(BigDecimal freeThreshold, BigDecimal charge) {
    public ShippingProperties {
        freeThreshold = freeThreshold == null ? BigDecimal.valueOf(2000) : freeThreshold;
        charge = charge == null ? BigDecimal.valueOf(99) : charge;
    }
}
