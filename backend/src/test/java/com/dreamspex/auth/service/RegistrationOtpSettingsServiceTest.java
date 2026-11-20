package com.dreamspex.auth.service;

import com.dreamspex.admin.AdminSettings;
import com.dreamspex.admin.AdminSettingsRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.SmsProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RegistrationOtpSettingsServiceTest {
    @Test
    void defaultsToEmailOtpAndMobileOff() {
        AdminSettingsRepository repository = mock(AdminSettingsRepository.class);
        when(repository.findById("global")).thenReturn(Optional.empty());
        SmsProperties smsProperties = new SmsProperties();
        MockEnvironment environment = new MockEnvironment();

        var options = new RegistrationOtpSettingsService(repository, smsProperties, environment).current();

        assertTrue(options.emailOtpEnabled());
        assertFalse(options.mobileOtpEnabled());
        assertFalse(options.smsConfigured());
    }

    @Test
    void reportsConfiguredForLocalDevAndProductionWithAllCredentials() {
        for (String profile : List.of("local", "dev", "production")) {
            assertTrue(service(profile, "msg91", "account-key", "widget-id", "widget-token").smsConfigured(),
                    profile);
        }
    }

    @Test
    void exposesOnlyTheWidgetConfigNeededByTheBrowserSdk() {
        var config = service("production", "msg91", "account-key", "widget-id", "widget-token").widgetConfig();

        assertEquals("widget-id", config.widgetId());
        assertEquals("widget-token", config.tokenAuth());
    }

    @Test
    void doesNotExposeWidgetConfigWhenSmsIsNotConfigured() {
        ApiException exception = assertThrows(ApiException.class,
                () -> service("production", "mock", "account-key", "widget-id", "widget-token").widgetConfig());

        assertEquals("OTP_SMS_NOT_CONFIGURED", exception.code());
    }

    @Test
    void keepsTestProfileUnconfiguredEvenWithAllCredentials() {
        assertFalse(service("test", "msg91", "account-key", "widget-id", "widget-token").smsConfigured());
    }

    @Test
    void requiresMsg91ProviderAndEveryCredentialInLocalDevAndProduction() {
        for (String profile : List.of("local", "dev", "production")) {
            assertFalse(service(profile, "mock", "account-key", "widget-id", "widget-token").smsConfigured(),
                    profile);
            assertFalse(service(profile, "msg91", "", "widget-id", "widget-token").smsConfigured(), profile);
            assertFalse(service(profile, "msg91", "account-key", "", "widget-token").smsConfigured(), profile);
            assertFalse(service(profile, "msg91", "account-key", "widget-id", "").smsConfigured(), profile);
        }
    }

    @Test
    void reportsPersistedChannelsWithoutChangingAdminSettings() {
        AdminSettingsRepository repository = mock(AdminSettingsRepository.class);
        AdminSettings stored = new AdminSettings();
        stored.setEmailOtpEnabled(false);
        stored.setMobileOtpEnabled(true);
        when(repository.findById("global")).thenReturn(Optional.of(stored));

        var options = new RegistrationOtpSettingsService(repository,
                smsProperties("msg91", "account-key", "widget-id", "widget-token"),
                environment("production")).current();

        assertFalse(options.emailOtpEnabled());
        assertTrue(options.mobileOtpEnabled());
        assertTrue(options.smsConfigured());
    }

    private RegistrationOtpSettingsService service(String profile, String provider, String authKey,
                                                   String widgetId, String widgetAuthToken) {
        return new RegistrationOtpSettingsService(mock(AdminSettingsRepository.class),
                smsProperties(provider, authKey, widgetId, widgetAuthToken), environment(profile));
    }

    private SmsProperties smsProperties(String provider, String authKey, String widgetId, String widgetAuthToken) {
        SmsProperties properties = new SmsProperties();
        properties.setProvider(provider);
        properties.setMsg91AuthKey(authKey);
        properties.setMsg91WidgetId(widgetId);
        properties.setMsg91WidgetAuthToken(widgetAuthToken);
        return properties;
    }

    private MockEnvironment environment(String profile) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profile);
        return environment;
    }
}
