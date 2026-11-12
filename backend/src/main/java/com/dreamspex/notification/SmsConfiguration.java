package com.dreamspex.notification;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import com.dreamspex.config.SecurityProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.time.Duration;

@Configuration
@EnableScheduling
public class SmsConfiguration {
    @Bean(name = "smsTaskScheduler")
    ThreadPoolTaskScheduler smsTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("customer-sms-");
        return scheduler;
    }

    @Bean
    SmsTemplateDataCipher smsTemplateDataCipher(SecurityProperties security) {
        String secret = firstConfigured(security.otpSecret(), security.deliveryLinkEncryptionSecret(),
                security.jwtSecret());
        return new SmsTemplateDataCipher(secret);
    }

    @Bean
    SmsGateway smsGateway(RestClient.Builder builder, SmsProperties properties, Environment environment) {
        boolean localProfile = java.util.Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> java.util.Set.of("local", "dev", "test")
                        .contains(profile.toLowerCase(java.util.Locale.ROOT)));
        if (localProfile) return new MockSmsGateway();
        return switch (properties.getProvider().toLowerCase(java.util.Locale.ROOT)) {
            case "mock" -> new MockSmsGateway();
            case "msg91" -> new Msg91SmsGateway(builder.requestFactory(msg91RequestFactory()), properties);
            default -> throw new IllegalStateException("Unsupported SMS provider configured.");
        };
    }

    private SimpleClientHttpRequestFactory msg91RequestFactory() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return requestFactory;
    }

    private String firstConfigured(String... values) {
        return java.util.Arrays.stream(values).filter(value -> value != null && !value.isBlank())
                .findFirst().orElse(null);
    }
}
