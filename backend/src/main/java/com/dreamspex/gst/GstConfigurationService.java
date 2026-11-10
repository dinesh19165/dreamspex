package com.dreamspex.gst;

import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static com.dreamspex.gst.GstDtos.*;

@Service
public class GstConfigurationService {
    private final GstConfigurationRepository configurations;
    private final CurrentUser currentUser;

    public GstConfigurationService(GstConfigurationRepository configurations, CurrentUser currentUser) {
        this.configurations = configurations;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public GstSettingsResponse current() {
        return response(configurations.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GST_CONFIGURATION_MISSING",
                        "GST configuration is unavailable.")));
    }

    @Transactional
    public GstSettingsResponse update(Authentication authentication, GstSettingsRequest request) {
        User actor = currentUser.require(authentication);
        GstPriceTreatment priceTreatment = GstPriceTreatment.valueOf(request.priceTreatment());
        if (priceTreatment == GstPriceTreatment.EXCLUSIVE && Boolean.TRUE.equals(request.enabled())) {
            throw new ApiException(HttpStatus.CONFLICT, "EXCLUSIVE_GST_NOT_ENABLED",
                    "Exclusive GST cannot be enabled until checkout and payment integration is complete.");
        }
        GstConfiguration previous = configurations.findActiveForUpdate()
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GST_CONFIGURATION_MISSING",
                        "GST configuration is unavailable."));
        previous.deactivate();
        configurations.saveAndFlush(previous);
        GstConfiguration updated = configurations.save(new GstConfiguration(
                request.defaultRate().setScale(2), priceTreatment, request.enabled(), actor));
        return response(updated);
    }

    @Transactional(readOnly = true)
    public List<GstHistoryResponse> history() {
        return configurations.findAllByOrderByUpdatedAtDesc().stream().map(this::historyResponse).toList();
    }

    private GstSettingsResponse response(GstConfiguration value) {
        User updatedBy = value.getUpdatedBy();
        return new GstSettingsResponse(value.getId(), value.getDefaultRate(), value.getPriceTreatment(),
                value.isEnabled(), value.getCreatedAt(), value.getUpdatedAt(),
                updatedBy == null ? null : updatedBy.getId(), updatedBy == null ? null : updatedBy.getDisplayName());
    }

    private GstHistoryResponse historyResponse(GstConfiguration value) {
        User updatedBy = value.getUpdatedBy();
        return new GstHistoryResponse(value.getId(), value.getDefaultRate(), value.getPriceTreatment(),
                value.isEnabled(), value.isActive(), value.getCreatedAt(), value.getUpdatedAt(),
                updatedBy == null ? null : updatedBy.getId(), updatedBy == null ? null : updatedBy.getDisplayName());
    }
}
