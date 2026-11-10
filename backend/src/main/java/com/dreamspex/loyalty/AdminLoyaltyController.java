package com.dreamspex.loyalty;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.common.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import static com.dreamspex.loyalty.LoyaltyDtos.*;

@RestController
@RequestMapping("/api/v1/admin/loyalty")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Validated
public class AdminLoyaltyController {
    private final LoyaltyService loyalty;
    private final UserRepository users;
    private final LoyaltyTransactionRepository transactions;

    public AdminLoyaltyController(LoyaltyService loyalty, UserRepository users,
                                  LoyaltyTransactionRepository transactions) {
        this.loyalty = loyalty;
        this.users = users;
        this.transactions = transactions;
    }

    @GetMapping("/settings")
    public ProgramSettingsResponse settings() { return loyalty.adminSettings(); }

    @PutMapping("/settings")
    public ProgramSettingsResponse updateSettings(Authentication authentication,
                                                  @Valid @RequestBody ProgramSettingsRequest request) {
        return loyalty.updateAdminSettings(authentication, request.loyalty(), request.referral());
    }

    @GetMapping("/report")
    public LoyaltyReportResponse report(@RequestParam(required = false) String search,
                                        @RequestParam(required = false) String status,
                                        @RequestParam(required = false) String fromDate,
                                        @RequestParam(required = false) String toDate,
                                        @RequestParam(defaultValue = "0") @Min(0) int page,
                                        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        return loyalty.adminReport(search, status, fromDate, toDate, page, pageSize);
    }

    @GetMapping("/customers/{customerId}")
    public CustomerRewardHistory customerHistory(@PathVariable String customerId) {
        User user = users.findById(customerId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Customer was not found."));
        return new CustomerRewardHistory(user.getId(), user.getDisplayName(), user.getEmail(), user.getPhone(),
                transactions.findTop100ByUserIdOrderByCreatedAtDesc(customerId).stream()
                        .map(transaction -> new LoyaltyTransactionResponse(transaction.getId(), transaction.getUserId(),
                                user.getDisplayName(), transaction.getTransactionType(), transaction.getPointsDelta(), transaction.getAmount(),
                                transaction.getDescription(), transaction.getOrderId(), transaction.getExpiresAt(),
                                transaction.getCreatedAt())).toList());
    }

    @PostMapping("/customers/{customerId}/adjustments")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void adjust(Authentication authentication, @PathVariable String customerId,
                       @Valid @RequestBody ManualAdjustmentRequest request) {
        loyalty.adminAdjust(authentication, customerId, request.points(), request.reason());
    }

    @GetMapping("/referrals")
    public LoyaltyReportResponse referrals(@RequestParam(required = false) String search,
                                           @RequestParam(required = false) String status,
                                           @RequestParam(required = false) String fromDate,
                                           @RequestParam(required = false) String toDate,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        return loyalty.adminReport(search, status, fromDate, toDate, page, pageSize);
    }

    public record ProgramSettingsRequest(@Valid LoyaltySettingsRequest loyalty,
                                         @Valid ReferralSettingsRequest referral) {}
    public record CustomerRewardHistory(String customerId, String displayName, String email,
                                        String phone, List<LoyaltyTransactionResponse> transactions) {}
}
