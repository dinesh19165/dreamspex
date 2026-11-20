package com.dreamspex.auth.service;

import com.dreamspex.admin.AdminSettings;
import com.dreamspex.admin.AdminSettingsRepository;
import com.dreamspex.auth.dto.AuthDtos.RegistrationOtpOptions;
import com.dreamspex.auth.dto.AuthDtos.RegistrationWidgetConfig;
import com.dreamspex.notification.SmsProperties;
import com.dreamspex.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

@Service
public class RegistrationOtpSettingsService {
    private final AdminSettingsRepository settings;
    private final SmsProperties smsProperties;
    private final Environment environment;

    public RegistrationOtpSettingsService(AdminSettingsRepository settings, SmsProperties smsProperties,
                                          Environment environment) {
        this.settings = settings;
        this.smsProperties = smsProperties;
        this.environment = environment;
    }

    public RegistrationOtpOptions current() {
        AdminSettings value = settings.findById("global").orElseGet(AdminSettings::new);
        return new RegistrationOtpOptions(value.isEmailOtpEnabled(), value.isMobileOtpEnabled(), smsConfigured());
    }

    public RegistrationWidgetConfig widgetConfig() {
        if (!smsConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "OTP_SMS_NOT_CONFIGURED",
                    "Mobile verification is temporarily unavailable. Please contact the administrator.");
        }
        return new RegistrationWidgetConfig(smsProperties.getMsg91WidgetId(),
                smsProperties.getMsg91WidgetAuthToken());
    }

    public boolean smsConfigured() {
        if (environment.acceptsProfiles(Profiles.of("test"))) {
            return false;
        }
        return "msg91".equalsIgnoreCase(smsProperties.getProvider())
                && hasText(smsProperties.getMsg91AuthKey())
                && hasText(smsProperties.getMsg91WidgetId())
                && hasText(smsProperties.getMsg91WidgetAuthToken());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
