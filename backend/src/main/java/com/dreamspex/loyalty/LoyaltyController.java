package com.dreamspex.loyalty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

import static com.dreamspex.loyalty.LoyaltyDtos.*;

@RestController
@RequestMapping("/api/v1/me")
@PreAuthorize("hasRole('CUSTOMER')")
public class LoyaltyController {
    private final LoyaltyService loyalty;

    public LoyaltyController(LoyaltyService loyalty) { this.loyalty = loyalty; }

    @GetMapping("/loyalty")
    public LoyaltyDashboardResponse dashboard(Authentication authentication) {
        return loyalty.dashboard(authentication);
    }

    @GetMapping("/loyalty/redemption-preview")
    public RedemptionPreview preview(Authentication authentication,
                                     @RequestParam @Min(0) int points,
                                     @RequestParam BigDecimal eligibleAmount) {
        return loyalty.previewRedemption(authentication, points, eligibleAmount);
    }

    @GetMapping("/referrals")
    public ReferralDashboardResponse referrals(Authentication authentication) {
        return loyalty.referralDashboard(authentication);
    }

    @PostMapping("/referrals/claim")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void claim(Authentication authentication, @Valid @RequestBody ReferralClaimRequest request) {
        loyalty.claimReferral(authentication, request.referralCode());
    }

    @GetMapping("/wallet")
    public WalletResponse wallet(Authentication authentication) {
        return loyalty.wallet(authentication);
    }
}
