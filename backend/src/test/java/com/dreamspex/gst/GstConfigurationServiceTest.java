package com.dreamspex.gst;

import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GstConfigurationServiceTest {
    @Mock GstConfigurationRepository configurations;
    @Mock CurrentUser currentUser;

    @Test
    void recordsEachConfigurationUpdateAsASeparateHistoryEntry() {
        var authentication = new UsernamePasswordAuthenticationToken("admin", null);
        User actor = new User();
        GstConfiguration previous = new GstConfiguration(new BigDecimal("18.00"),
                GstPriceTreatment.INCLUSIVE, true, null);
        when(currentUser.require(authentication)).thenReturn(actor);
        when(configurations.findActiveForUpdate()).thenReturn(Optional.of(previous));
        when(configurations.save(any(GstConfiguration.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = service().update(authentication, new GstDtos.GstSettingsRequest(
                new BigDecimal("12.00"), "INCLUSIVE", true));

        assertEquals(new BigDecimal("12.00"), result.defaultRate());
        verify(configurations).saveAndFlush(previous);
        verify(configurations).save(any(GstConfiguration.class));
    }

    @Test
    void refusesToEnableExclusiveGstUntilPaymentIntegrationIsReady() {
        var authentication = new UsernamePasswordAuthenticationToken("admin", null);
        when(currentUser.require(authentication)).thenReturn(new User());

        ApiException error = assertThrows(ApiException.class, () -> service().update(authentication,
                new GstDtos.GstSettingsRequest(new BigDecimal("18.00"), "EXCLUSIVE", true)));

        assertEquals("EXCLUSIVE_GST_NOT_ENABLED", error.code());
    }

    private GstConfigurationService service() {
        return new GstConfigurationService(configurations, currentUser);
    }
}
