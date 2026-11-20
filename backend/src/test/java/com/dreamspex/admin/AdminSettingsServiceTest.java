package com.dreamspex.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.auth.service.RegistrationOtpSettingsService;
import com.dreamspex.config.DynamicSmtpMailService;
import com.dreamspex.config.SmtpSecretCipher;
import com.dreamspex.payment.PaymentProperties;
import com.dreamspex.security.CurrentUser;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminSettingsServiceTest {
    @Test
    void savesEmailAndMobileOtpTogglesIndependently() {
        AdminSettingsRepository repository = mock(AdminSettingsRepository.class);
        CurrentUser current = mock(CurrentUser.class);
        RegistrationOtpSettingsService otpSettings = mock(RegistrationOtpSettingsService.class);
        AdminSettings stored = new AdminSettings();
        Authentication authentication = mock(Authentication.class);
        when(current.require(authentication)).thenReturn(new User());
        when(repository.findById("global")).thenReturn(Optional.of(stored));
        when(repository.save(any(AdminSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(otpSettings.smsConfigured()).thenReturn(true);

        AdminSettingsService service = new AdminSettingsService(repository, current, mock(UserRepository.class),
                mock(PasswordEncoder.class), mock(AuditLogService.class), mock(PaymentProperties.class),
                mock(Environment.class), mock(SmtpSecretCipher.class), mock(DynamicSmtpMailService.class),
                otpSettings);

        service.saveOtpSettings(authentication, new AdminSettingsDtos.OtpSettingsRequest(true, false));
        assertTrue(stored.isEmailOtpEnabled());
        assertFalse(stored.isMobileOtpEnabled());

        service.saveOtpSettings(authentication, new AdminSettingsDtos.OtpSettingsRequest(false, true));
        assertFalse(stored.isEmailOtpEnabled());
        assertTrue(stored.isMobileOtpEnabled());
    }
}
