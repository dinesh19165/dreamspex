package com.dreamspex.payment;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties(prefix="dreamspex.payment")
public record PaymentProperties(String provider,String keyId,String keySecret,String webhookSecret){}
