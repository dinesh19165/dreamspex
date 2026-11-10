package com.dreamspex.loyalty;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
class LoyaltySettingsTestInitializer implements ApplicationRunner {
    private final LoyaltySettingsRepository loyaltySettings;
    private final ReferralSettingsRepository referralSettings;

    LoyaltySettingsTestInitializer(LoyaltySettingsRepository loyaltySettings,
                                   ReferralSettingsRepository referralSettings) {
        this.loyaltySettings = loyaltySettings;
        this.referralSettings = referralSettings;
    }

    @Override
    public void run(ApplicationArguments args) {
        loyaltySettings.findById(1).orElseGet(() -> loyaltySettings.save(new LoyaltySettings()));
        referralSettings.findById(1).orElseGet(() -> referralSettings.save(new ReferralSettings()));
    }
}
