package com.dreamspex.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import com.dreamspex.payment.PaymentProperties;

@Configuration
@EnableConfigurationProperties({SecurityProperties.class, CorsProperties.class, PaymentProperties.class,
        ShippingProperties.class})
public class AppConfig {
}
