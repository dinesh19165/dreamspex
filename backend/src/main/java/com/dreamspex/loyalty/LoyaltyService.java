package com.dreamspex.loyalty;

import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.security.CurrentUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.dreamspex.loyalty.LoyaltyDtos.*;

@Service
public class LoyaltyService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CurrentUser current;
    private final UserRepository users;
    private final OrderRepository orders;
    private final LoyaltySettingsRepository settingsRepository;
    private final ReferralSettingsRepository referralSettingsRepository;
    private final LoyaltyAccountRepository accounts;
    private final LoyaltyTransactionRepository transactions;
    private final LoyaltyPointLotRepository lots;
    private final ReferralCodeRepository codes;
    private final ReferralRepository referrals;
    private final WalletAccountRepository wallets;
    private final WalletTransactionRepository walletTransactions;
    private final AuditLogService auditLogs;

    public LoyaltyService(CurrentUser current, UserRepository users, OrderRepository orders,
                          LoyaltySettingsRepository settingsRepository,
                          ReferralSettingsRepository referralSettingsRepository,
                          LoyaltyAccountRepository accounts, LoyaltyTransactionRepository transactions,
                          LoyaltyPointLotRepository lots, ReferralCodeRepository codes,
                          ReferralRepository referrals, WalletAccountRepository wallets,
                          WalletTransactionRepository walletTransactions, AuditLogService auditLogs) {
        this.current = current;
        this.users = users;
        this.orders = orders;
        this.settingsRepository = settingsRepository;
        this.referralSettingsRepository = referralSettingsRepository;
        this.accounts = accounts;
        this.transactions = transactions;
        this.lots = lots;
        this.codes = codes;
        this.referrals = referrals;
        this.wallets = wallets;
        this.walletTransactions = walletTransactions;
        this.auditLogs = auditLogs;
    }

    @Transactional(readOnly = true)
    public ProgramSettingsResponse adminSettings() {
        return new ProgramSettingsResponse(loyaltySettings(settings()), referralSettings(referralSettings()));
    }

    @Transactional
    public ProgramSettingsResponse updateAdminSettings(Authentication authentication,
                                                        LoyaltySettingsRequest loyaltyInput,
                                                        ReferralSettingsRequest referralInput) {
        User admin = current.require(authentication);
        LoyaltySettings loyalty = settings();
        loyalty.setEnabled(loyaltyInput.enabled());
        loyalty.setPointsPerHundred(loyaltyInput.pointsPerHundred());
        loyalty.setMinimumOrderAmount(money(loyaltyInput.minimumOrderAmount()));
        loyalty.setMinimumRedemptionPoints(loyaltyInput.minimumRedemptionPoints());
        loyalty.setRedemptionPoints(loyaltyInput.redemptionPoints());
        loyalty.setRedemptionAmount(money(loyaltyInput.redemptionAmount()));
        loyalty.setMaximumRedemptionPercent(loyaltyInput.maximumRedemptionPercent());
        loyalty.setPointsExpiryDays(loyaltyInput.pointsExpiryDays());
        loyalty.setProductPurchasePointsEnabled(loyaltyInput.productPurchasePointsEnabled());
        loyalty.setUpdatedAt(Instant.now());
        settingsRepository.save(loyalty);

        ReferralSettings referral = referralSettings();
        referral.setEnabled(referralInput.enabled());
        referral.setRewardType(referralInput.rewardType());
        referral.setReferrerRewardAmount(referralInput.referrerRewardAmount());
        referral.setNewCustomerRewardAmount(referralInput.newCustomerRewardAmount());
        referral.setMinimumPurchaseAmount(money(referralInput.minimumPurchaseAmount()));
        referral.setRewardExpiryDays(referralInput.rewardExpiryDays());
        referral.setMaximumRewardsPerCustomer(referralInput.maximumRewardsPerCustomer());
        referral.setUpdatedAt(Instant.now());
        referralSettingsRepository.save(referral);
        auditLogs.record(admin, "LOYALTY_AND_REFERRAL_SETTINGS_UPDATED", "LOYALTY_PROGRAM", "1");
        return new ProgramSettingsResponse(loyaltySettings(loyalty), referralSettings(referral));
    }

    @Transactional
    public LoyaltyDashboardResponse dashboard(Authentication authentication) {
        User user = current.require(authentication);
        expireUserPoints(user.getId(), Instant.now());
        LoyaltyAccount account = account(user.getId());
        List<LoyaltyTransaction> history = transactions.findTop100ByUserIdOrderByCreatedAtDesc(user.getId());
        Instant now = Instant.now();
        Instant soon = now.plusSeconds(30L * 24 * 60 * 60);
        long expiring = lots.sumExpiringPoints(user.getId(), now, soon);
        Instant nextExpiry = lots.findSpendableForUpdate(user.getId(), now).stream()
                .filter(lot -> lot.getRemainingPoints() > 0)
                .map(LoyaltyPointLot::getExpiresAt).findFirst().orElse(null);
        return new LoyaltyDashboardResponse(loyaltySettings(settings()), account.getAvailablePoints(),
                account.getTotalEarned(), account.getTotalRedeemed(), expiring, nextExpiry,
                history.stream().map(transaction -> transactionResponse(transaction, user.getDisplayName())).toList());
    }

    @Transactional(readOnly = true)
    public RedemptionPreview previewRedemption(Authentication authentication, int requestedPoints,
                                               BigDecimal eligibleAmount) {
        User user = current.require(authentication);
        return preview(user.getId(), requestedPoints, eligibleAmount);
    }

    @Transactional
    public RedemptionPreview preview(String userId, int requestedPoints, BigDecimal eligibleAmount) {
        LoyaltySettings settings = settings();
        expireUserPoints(userId, Instant.now());
        long available = account(userId).getAvailablePoints();
        if (requestedPoints < 0) throw invalid("Redeemed points cannot be negative.");
        if (requestedPoints == 0) return new RedemptionPreview(available, 0, BigDecimal.ZERO, maximumRedeemable(settings, eligibleAmount, available));
        if (!settings.isEnabled()) throw conflict("LOYALTY_DISABLED", "Loyalty point redemption is not currently available.");
        if (eligibleAmount.compareTo(settings.getMinimumOrderAmount()) < 0) {
            throw conflict("LOYALTY_MINIMUM_ORDER", "This order does not meet the minimum amount for loyalty points.");
        }
        int maximum = maximumRedeemable(settings, eligibleAmount, available);
        if (requestedPoints < settings.getMinimumRedemptionPoints()) {
            throw invalid("The minimum redemption is " + settings.getMinimumRedemptionPoints() + " points.");
        }
        if (requestedPoints > available) throw conflict("INSUFFICIENT_LOYALTY_POINTS", "You do not have enough available loyalty points.");
        if (requestedPoints > maximum) {
            throw conflict("LOYALTY_REDEMPTION_LIMIT", "The requested points exceed the maximum permitted for this order.");
        }
        return new RedemptionPreview(available, requestedPoints, redemptionValue(settings, requestedPoints), maximum);
    }

    @Transactional
    public RedemptionPreview redeemForOrder(String userId, String orderId, int requestedPoints, BigDecimal eligibleAmount) {
        RedemptionPreview preview = preview(userId, requestedPoints, eligibleAmount);
        if (requestedPoints == 0) return preview;
        String reference = "ORDER:" + orderId + ":REDEMPTION";
        if (transactions.findByReferenceKey(reference).isPresent()) return preview;
        LoyaltyAccount account = lockedAccount(userId);
        if (account.getAvailablePoints() < requestedPoints) {
            throw conflict("INSUFFICIENT_LOYALTY_POINTS", "Your available loyalty point balance changed. Refresh checkout and try again.");
        }
        long remaining = requestedPoints;
        for (LoyaltyPointLot lot : lots.findSpendableForUpdate(userId, Instant.now())) {
            long used = Math.min(remaining, lot.getRemainingPoints());
            lot.setRemainingPoints(lot.getRemainingPoints() - used);
            remaining -= used;
            if (remaining == 0) break;
        }
        if (remaining > 0) throw conflict("INSUFFICIENT_LOYALTY_POINTS", "Your available loyalty point balance changed. Refresh checkout and try again.");
        account.setAvailablePoints(account.getAvailablePoints() - requestedPoints);
        account.setTotalRedeemed(account.getTotalRedeemed() + requestedPoints);
        account.setUpdatedAt(Instant.now());
        saveTransaction(userId, orderId, "REDEMPTION", -requestedPoints,
                preview.discount(), reference, "Loyalty points redeemed", null);
        return preview;
    }

    @Transactional
    public void processDeliveredOrder(Order order) {
        if (!"DELIVERED".equals(order.getStatus()) || !"PAID".equals(order.getPaymentStatus())) return;
        expireUserPoints(order.getUser().getId(), Instant.now());
        LoyaltySettings settings = settings();
        BigDecimal qualifyingAmount = orderTotalBeforeLoyalty(order);
        if (settings.isEnabled() && settings.isProductPurchasePointsEnabled()
                && qualifyingAmount.compareTo(settings.getMinimumOrderAmount()) >= 0
                && settings.getPointsPerHundred() > 0) {
            long points = qualifyingAmount.divide(new BigDecimal("100"), 0, RoundingMode.FLOOR)
                    .multiply(BigDecimal.valueOf(settings.getPointsPerHundred())).longValueExact();
            if (points > 0) {
                creditPoints(order.getUser().getId(), points, "ORDER:" + order.getId() + ":EARN",
                        "ORDER_EARN", order.getId(), qualifyingAmount,
                        "Points earned for delivered order " + order.getOrderNumber(), settings.getPointsExpiryDays());
            }
        }
        qualifyReferral(order, qualifyingAmount);
    }

    @Transactional
    public void restoreRedemption(Order order, String referenceKey, BigDecimal refundedAmount) {
        String redemptionReference = "ORDER:" + order.getId() + ":REDEMPTION";
        LoyaltyTransaction redemption = transactions.findByReferenceKey(redemptionReference).orElse(null);
        if (redemption == null) return;
        long totalRedeemed = -redemption.getPointsDelta();
        if (totalRedeemed <= 0) return;
        long alreadyRestored = transactions.sumPointsForOrderAndType(order.getId(), "REDEMPTION_REFUND");
        long refundablePoints = totalRedeemed - alreadyRestored;
        if (refundablePoints <= 0) return;
        BigDecimal orderPaid = order.getTotalAmount();
        long restore = refundedAmount == null || refundedAmount.compareTo(orderPaid) >= 0
                ? refundablePoints
                : Math.min(refundablePoints, BigDecimal.valueOf(totalRedeemed)
                        .multiply(refundedAmount).divide(orderPaid, 0, RoundingMode.FLOOR).longValue());
        if (restore > 0) creditPoints(order.getUser().getId(), restore, referenceKey,
                "REDEMPTION_REFUND", order.getId(), refundedAmount == null ? BigDecimal.ZERO : refundedAmount,
                "Loyalty points restored after order refund", settings().getPointsExpiryDays());
    }

    @Transactional
    public void reverseEarnedPointsForRefund(Order order, BigDecimal refundedAmount, String referenceKey) {
        LoyaltyTransaction earning = transactions.findByReferenceKey("ORDER:" + order.getId() + ":EARN").orElse(null);
        if (earning == null || earning.getPointsDelta() <= 0) return;
        long totalEarned = earning.getPointsDelta();
        long alreadyReversed = -transactions.sumPointsForOrderAndType(order.getId(), "REFUND_REVERSAL");
        long remaining = Math.max(0, totalEarned - alreadyReversed);
        if (remaining == 0) return;
        long points = refundedAmount == null || refundedAmount.compareTo(order.getTotalAmount()) >= 0
                ? remaining
                : Math.min(remaining, BigDecimal.valueOf(totalEarned).multiply(refundedAmount)
                        .divide(order.getTotalAmount(), 0, RoundingMode.FLOOR).longValue());
        if (points == 0) return;
        LoyaltyAccount account = lockedAccount(order.getUser().getId());
        long toRemove = Math.min(points, account.getAvailablePoints());
        if (toRemove > 0) {
            account.setAvailablePoints(account.getAvailablePoints() - toRemove);
            account.setUpdatedAt(Instant.now());
            saveTransaction(order.getUser().getId(), order.getId(), "REFUND_REVERSAL", -toRemove,
                    refundedAmount == null ? BigDecimal.ZERO : refundedAmount, referenceKey,
                    "Points reversed for refunded order " + order.getOrderNumber(), null);
        }
    }

    @Transactional
    public void registerReferral(User referredUser, String referralCode) {
        if (referralCode == null || referralCode.isBlank()) return;
        ReferralSettings referralSettings = referralSettings();
        if (!referralSettings.isEnabled()) throw conflict("REFERRALS_DISABLED", "The referral program is not currently available.");
        lockedAccount(referredUser.getId());
        String normalized = referralCode.trim().toUpperCase(java.util.Locale.ROOT);
        ReferralCode code = codes.findByCodeIgnoreCase(normalized)
                .orElseThrow(() -> invalid("The referral code is not valid."));
        if (code.getUserId().equals(referredUser.getId())) throw invalid("You cannot use your own referral code.");
        if (referrals.findByReferredUserId(referredUser.getId()).isPresent()) {
            throw conflict("REFERRAL_ALREADY_CLAIMED", "A referral code has already been applied to this account.");
        }
        Referral referral = new Referral();
        referral.setReferrerId(code.getUserId());
        referral.setReferredUserId(referredUser.getId());
        referral.setReferralCode(code.getCode());
        referrals.save(referral);
    }

    @Transactional
    public ReferralDashboardResponse referralDashboard(Authentication authentication) {
        User user = current.require(authentication);
        ReferralSettings settings = referralSettings();
        String code = getOrCreateReferralCode(user.getId());
        List<Referral> referred = referrals.findByReferrerIdOrderByCreatedAtDesc(user.getId());
        Map<String, User> customerMap = users.findAllById(referred.stream()
                .map(Referral::getReferredUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        BigDecimal walletRewards = referred.stream().filter(r -> "SUCCESSFUL".equals(r.getStatus())
                        && "WALLET_CREDIT".equals(r.getRewardType()))
                .map(r -> BigDecimal.valueOf(r.getReferrerRewardAmount() == null ? 0 : r.getReferrerRewardAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long pointRewards = referred.stream().filter(r -> "SUCCESSFUL".equals(r.getStatus())
                        && "LOYALTY_POINTS".equals(r.getRewardType()))
                .mapToLong(r -> r.getReferrerRewardAmount() == null ? 0 : r.getReferrerRewardAmount()).sum();
        List<ReferralHistoryResponse> history = referred.stream().map(referral -> {
            User referredUser = customerMap.get(referral.getReferredUserId());
            int reward = referral.getReferrerRewardAmount() == null ? settings.getReferrerRewardAmount() : referral.getReferrerRewardAmount();
            return new ReferralHistoryResponse(referral.getId(), referral.getStatus(), referral.getReferralCode(),
                    referredUser == null ? "Customer" : referredUser.getDisplayName(),
                    referral.getRewardType() == null ? settings.getRewardType() : referral.getRewardType(),
                    reward, referral.getCreatedAt(), referral.getQualifiedAt());
        }).toList();
        return new ReferralDashboardResponse(settings.isEnabled(), settings.getRewardType(), code,
                "/register?ref=" + code,
                referrals.countByReferrerIdAndStatus(user.getId(), "SUCCESSFUL"),
                referrals.countByReferrerIdAndStatus(user.getId(), "PENDING"), walletRewards, pointRewards, history);
    }

    @Transactional
    public void claimReferral(Authentication authentication, String referralCode) {
        User user = current.require(authentication);
        if (orders.countByUserIdAndPaymentStatusAndStatusIn(user.getId(), "PAID",
                List.of("PAID", "PROCESSING", "SHIPPED", "DELIVERED")) > 0) {
            throw conflict("REFERRAL_CLAIM_TOO_LATE", "A referral code must be applied before your first order.");
        }
        registerReferral(user, referralCode);
    }

    @Transactional
    public WalletResponse wallet(Authentication authentication) {
        User user = current.require(authentication);
        expireWalletCredits(user.getId(), Instant.now());
        WalletAccount account = wallets.findById(user.getId()).orElse(new WalletAccount(user.getId()));
        List<WalletTransactionResponse> history = walletTransactions
                .findTop100ByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(transaction -> new WalletTransactionResponse(transaction.getTransactionType(),
                        transaction.getAmountDelta(), transaction.getDescription(), transaction.getExpiresAt(),
                        transaction.getCreatedAt())).toList();
        return new WalletResponse(account.getBalance(), account.getTotalCredited(), account.getTotalDebited(), history);
    }

    @Transactional
    public LoyaltyReportResponse adminReport(String search, String status, String fromDate, String toDate,
                                             int page, int pageSize) {
        String customerSearch = search == null || search.isBlank() ? null : search.trim();
        Instant from = parseReportDate(fromDate, false);
        Instant to = parseReportDate(toDate, true);
        if (from != null && to != null && !from.isBefore(to)) throw invalid("The report date range is invalid.");
        String transactionType = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) ? null : status;
        Page<LoyaltyTransaction> txPage = transactions.search(customerSearch, from, to, transactionType,
                PageRequest.of(page, pageSize));
        String referralStatus = status != null && List.of("PENDING", "SUCCESSFUL", "LIMIT_REACHED")
                .contains(status.toUpperCase(java.util.Locale.ROOT)) ? status.toUpperCase(java.util.Locale.ROOT) : null;
        Page<Referral> referralPage = referrals.search(customerSearch, referralStatus, from, to, PageRequest.of(page, pageSize));
        List<String> txUserIds = txPage.getContent().stream().map(LoyaltyTransaction::getUserId).distinct().toList();
        Map<String, User> txUsers = users.findAllById(txUserIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<LoyaltyTransactionResponse> tx = txPage.getContent().stream().map(transaction ->
                transactionResponse(transaction, displayName(txUsers.get(transaction.getUserId())))).toList();
        List<Referral> referralItems = referralPage.getContent();
        List<String> ids = referralItems.stream().flatMap(r -> java.util.stream.Stream.of(r.getReferrerId(), r.getReferredUserId()))
                .distinct().toList();
        Map<String, User> names = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        List<AdminReferralResponse> referralResponses = referralItems.stream().map(r -> new AdminReferralResponse(
                r.getId(), r.getReferrerId(), displayName(names.get(r.getReferrerId())), r.getReferredUserId(),
                displayName(names.get(r.getReferredUserId())), r.getStatus(), r.getRewardType(),
                r.getReferrerRewardAmount(), r.getNewCustomerRewardAmount(), r.getCreatedAt(), r.getQualifiedAt())).toList();
        long issued = transactions.totalPositivePoints() == null ? 0 : transactions.totalPositivePoints();
        long redeemed = transactions.totalRedeemedPoints() == null ? 0 : transactions.totalRedeemedPoints();
        long outstanding = accounts.findAll().stream().mapToLong(LoyaltyAccount::getAvailablePoints).sum();
        BigDecimal walletRewards = referrals.findAll().stream().filter(r -> "SUCCESSFUL".equals(r.getStatus())
                        && "WALLET_CREDIT".equals(r.getRewardType()))
                .map(r -> BigDecimal.valueOf((r.getReferrerRewardAmount() == null ? 0 : r.getReferrerRewardAmount())
                        + (r.getNewCustomerRewardAmount() == null ? 0 : r.getNewCustomerRewardAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long pointRewards = referrals.findAll().stream().filter(r -> "SUCCESSFUL".equals(r.getStatus())
                        && "LOYALTY_POINTS".equals(r.getRewardType()))
                .mapToLong(r -> (long) (r.getReferrerRewardAmount() == null ? 0 : r.getReferrerRewardAmount())
                        + (r.getNewCustomerRewardAmount() == null ? 0 : r.getNewCustomerRewardAmount())).sum();
        BigDecimal liability = BigDecimal.valueOf(outstanding)
                .multiply(settings().getRedemptionAmount())
                .divide(BigDecimal.valueOf(settings().getRedemptionPoints()), 2, RoundingMode.HALF_UP);
        return new LoyaltyReportResponse(issued, redeemed, outstanding, liability, referrals.count(),
                referrals.countByStatus("SUCCESSFUL"), referrals.countByStatus("PENDING"), walletRewards, pointRewards,
                tx, referralResponses, page, pageSize, Math.max(txPage.getTotalElements(), referralPage.getTotalElements()));
    }

    @Transactional
    public void adminAdjust(Authentication authentication, String customerId, long points, String reason) {
        User admin = current.require(authentication);
        User customer = users.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Customer was not found."));
        creditPoints(customer.getId(), points, "ADMIN:" + UUID.randomUUID(), "ADMIN_ADJUSTMENT", null,
                BigDecimal.ZERO, reason.trim(), settings().getPointsExpiryDays());
        auditLogs.record(admin, "LOYALTY_POINTS_ADJUSTED", "CUSTOMER", customer.getId());
    }

    @Transactional
    public void expirePoints() {
        Instant now = Instant.now();
        List<LoyaltyPointLot> expired = lots.findByExpiresAtLessThanEqualAndRemainingPointsGreaterThan(now, 0);
        for (LoyaltyPointLot lot : expired) expireLot(lot, now);
        expireWalletCredits(null, now);
    }

    @Scheduled(cron = "0 15 2 * * *")
    @Transactional
    public void scheduledExpiry() {
        expirePoints();
    }

    private void qualifyReferral(Order order, BigDecimal qualifyingAmount) {
        ReferralSettings settings = referralSettings();
        if (!settings.isEnabled() || qualifyingAmount.compareTo(settings.getMinimumPurchaseAmount()) < 0) return;
        Referral referral = referrals.findByReferredUserIdForUpdate(order.getUser().getId()).orElse(null);
        if (referral == null || !"PENDING".equals(referral.getStatus())) return;
        lockedAccount(referral.getReferrerId());
        if (referrals.countByReferrerIdAndStatus(referral.getReferrerId(), "SUCCESSFUL")
                >= settings.getMaximumRewardsPerCustomer()) {
            referral.setStatus("LIMIT_REACHED");
            return;
        }
        Instant expiresAt = Instant.now().plusSeconds(settings.getRewardExpiryDays() * 86400L);
        issueReferralReward(referral.getReferrerId(), referral.getId(), "REFERRER",
                settings.getReferrerRewardAmount(), settings, expiresAt);
        issueReferralReward(referral.getReferredUserId(), referral.getId(), "REFERRED",
                settings.getNewCustomerRewardAmount(), settings, expiresAt);
        referral.setStatus("SUCCESSFUL");
        referral.setQualifyingOrderId(order.getId());
        referral.setRewardType(settings.getRewardType());
        referral.setReferrerRewardAmount(settings.getReferrerRewardAmount());
        referral.setNewCustomerRewardAmount(settings.getNewCustomerRewardAmount());
        referral.setQualifiedAt(Instant.now());
    }

    private void issueReferralReward(String userId, String referralId, String recipient,
                                     int amount, ReferralSettings settings, Instant expiresAt) {
        if (amount <= 0) return;
        String reference = "REFERRAL:" + referralId + ":" + recipient;
        if ("LOYALTY_POINTS".equals(settings.getRewardType())) {
            creditPoints(userId, amount, reference, "REFERRAL_REWARD", null, BigDecimal.ZERO,
                    "Referral reward", settings.getRewardExpiryDays());
            return;
        }
        if (walletTransactions.findByReferenceKey(reference).isPresent()) return;
        WalletAccount account = lockedWallet(userId);
        BigDecimal credit = BigDecimal.valueOf(amount).setScale(2, RoundingMode.UNNECESSARY);
        account.setBalance(account.getBalance().add(credit));
        account.setTotalCredited(account.getTotalCredited().add(credit));
        account.setUpdatedAt(Instant.now());
        WalletTransaction transaction = new WalletTransaction();
        transaction.setUserId(userId);
        transaction.setTransactionType("REFERRAL_REWARD");
        transaction.setAmountDelta(credit);
        transaction.setReferenceKey(reference);
        transaction.setDescription("Referral reward");
        transaction.setExpiresAt(expiresAt);
        walletTransactions.save(transaction);
    }

    private void creditPoints(String userId, long points, String reference, String type, String orderId,
                              BigDecimal amount, String description, int expiryDays) {
        if (points <= 0 || transactions.findByReferenceKey(reference).isPresent()) return;
        expireUserPoints(userId, Instant.now());
        LoyaltyAccount account = lockedAccount(userId);
        LoyaltyTransaction transaction = saveTransaction(userId, orderId, type, points, amount, reference,
                description, Instant.now().plusSeconds(expiryDays * 86400L));
        account.setAvailablePoints(Math.addExact(account.getAvailablePoints(), points));
        account.setTotalEarned(Math.addExact(account.getTotalEarned(), points));
        account.setUpdatedAt(Instant.now());
        LoyaltyPointLot lot = new LoyaltyPointLot();
        lot.setUserId(userId);
        lot.setTransactionId(transaction.getId());
        lot.setOriginalPoints(points);
        lot.setRemainingPoints(points);
        lot.setExpiresAt(transaction.getExpiresAt());
        lots.save(lot);
    }

    private LoyaltyTransaction saveTransaction(String userId, String orderId, String type, long points,
                                               BigDecimal amount, String reference, String description,
                                               Instant expiresAt) {
        LoyaltyTransaction transaction = new LoyaltyTransaction();
        transaction.setUserId(userId);
        transaction.setOrderId(orderId);
        transaction.setTransactionType(type);
        transaction.setPointsDelta(points);
        transaction.setAmount(amount == null ? BigDecimal.ZERO : money(amount));
        transaction.setReferenceKey(reference);
        transaction.setDescription(description);
        transaction.setExpiresAt(expiresAt);
        return transactions.save(transaction);
    }

    private void expireUserPoints(String userId, Instant now) {
        List<LoyaltyPointLot> expired = lots.findByExpiresAtLessThanEqualAndRemainingPointsGreaterThan(now, 0).stream()
                .filter(lot -> lot.getUserId().equals(userId)).toList();
        for (LoyaltyPointLot lot : expired) expireLot(lot, now);
    }

    private void expireLot(LoyaltyPointLot lot, Instant now) {
        if (lot.getRemainingPoints() <= 0) return;
        LoyaltyAccount account = lockedAccount(lot.getUserId());
        long expired = Math.min(lot.getRemainingPoints(), account.getAvailablePoints());
        if (expired <= 0) {
            lot.setRemainingPoints(0);
            return;
        }

        lot.setRemainingPoints(lot.getRemainingPoints() - expired);
        account.setAvailablePoints(account.getAvailablePoints() - expired);
        account.setUpdatedAt(now);
        String reference = "EXPIRY:" + lot.getId();
        if (transactions.findByReferenceKey(reference).isEmpty()) {
            saveTransaction(lot.getUserId(), null, "EXPIRY", -expired, BigDecimal.ZERO,
                    reference, "Loyalty points expired", null);
        }
    }

    private void expireWalletCredits(String userId, Instant now) {
        List<WalletTransaction> expired = walletTransactions
                .findByExpiresAtLessThanEqualAndAmountDeltaGreaterThan(now, BigDecimal.ZERO).stream()
                .filter(transaction -> userId == null || transaction.getUserId().equals(userId)).toList();
        for (WalletTransaction credit : expired) {
            String reference = "WALLET_EXPIRY:" + credit.getId();
            if (walletTransactions.findByReferenceKey(reference).isPresent()) continue;
            WalletAccount account = lockedWallet(credit.getUserId());
            BigDecimal amount = credit.getAmountDelta().min(account.getBalance());
            if (amount.signum() <= 0) continue;
            account.setBalance(account.getBalance().subtract(amount));
            account.setUpdatedAt(now);
            WalletTransaction expiry = new WalletTransaction();
            expiry.setUserId(credit.getUserId());
            expiry.setTransactionType("EXPIRY");
            expiry.setAmountDelta(amount.negate());
            expiry.setReferenceKey(reference);
            expiry.setDescription("Referral wallet credit expired");
            walletTransactions.save(expiry);
        }
    }

    @Transactional
    public void initializeCustomer(User user) {
        accounts.findById(user.getId()).orElseGet(() -> accounts.save(new LoyaltyAccount(user.getId())));
    }

    private LoyaltyAccount account(String userId) {
        return accounts.findById(userId).orElseGet(() -> accounts.save(new LoyaltyAccount(userId)));
    }

    private LoyaltyAccount lockedAccount(String userId) {
        return accounts.findByUserIdForUpdate(userId).orElseGet(() -> accounts.saveAndFlush(new LoyaltyAccount(userId)));
    }

    private WalletAccount lockedWallet(String userId) {
        return wallets.findByUserIdForUpdate(userId).orElseGet(() -> wallets.saveAndFlush(new WalletAccount(userId)));
    }

    private LoyaltySettings settings() {
        return settingsRepository.findById(1).orElseThrow(() ->
                new IllegalStateException("Loyalty settings were not initialized by the database migration."));
    }

    private ReferralSettings referralSettings() {
        return referralSettingsRepository.findById(1).orElseThrow(() ->
                new IllegalStateException("Referral settings were not initialized by the database migration."));
    }

    private int maximumRedeemable(LoyaltySettings settings, BigDecimal eligibleAmount, long available) {
        if (!settings.isEnabled() || eligibleAmount == null
                || eligibleAmount.compareTo(settings.getMinimumOrderAmount()) < 0
                || eligibleAmount.signum() <= 0 || settings.getRedemptionAmount().signum() <= 0) return 0;
        BigDecimal maximumValue = eligibleAmount.multiply(settings.getMaximumRedemptionPercent())
                .divide(new BigDecimal("100"), 2, RoundingMode.FLOOR);
        long byOrder = maximumValue.multiply(BigDecimal.valueOf(settings.getRedemptionPoints()))
                .divide(settings.getRedemptionAmount(), 0, RoundingMode.FLOOR).longValue();
        return (int) Math.min(Math.min(Integer.MAX_VALUE, available), byOrder);
    }

    private BigDecimal redemptionValue(LoyaltySettings settings, int points) {
        return BigDecimal.valueOf(points).multiply(settings.getRedemptionAmount())
                .divide(BigDecimal.valueOf(settings.getRedemptionPoints()), 2, RoundingMode.DOWN);
    }

    private BigDecimal orderTotalBeforeLoyalty(Order order) {
        return order.getTotalAmount().add(order.getLoyaltyDiscountAmount() == null
                ? BigDecimal.ZERO : order.getLoyaltyDiscountAmount());
    }

    private String getOrCreateReferralCode(String userId) {
        return codes.findById(userId).map(ReferralCode::getCode).orElseGet(() -> {
            String code;
            do {
                byte[] bytes = new byte[7];
                RANDOM.nextBytes(bytes);
                code = "DS" + java.util.HexFormat.of().withUpperCase().formatHex(bytes);
            } while (codes.findByCodeIgnoreCase(code).isPresent());
            return codes.save(new ReferralCode(userId, code)).getCode();
        });
    }

    private LoyaltySettingsResponse loyaltySettings(LoyaltySettings settings) {
        return new LoyaltySettingsResponse(settings.isEnabled(), settings.getPointsPerHundred(),
                settings.getMinimumOrderAmount(), settings.getMinimumRedemptionPoints(),
                settings.getRedemptionPoints(), settings.getRedemptionAmount(),
                settings.getMaximumRedemptionPercent(), settings.getPointsExpiryDays(),
                settings.isProductPurchasePointsEnabled());
    }

    private ReferralSettingsResponse referralSettings(ReferralSettings settings) {
        return new ReferralSettingsResponse(settings.isEnabled(), settings.getRewardType(),
                settings.getReferrerRewardAmount(), settings.getNewCustomerRewardAmount(),
                settings.getMinimumPurchaseAmount(), settings.getRewardExpiryDays(),
                settings.getMaximumRewardsPerCustomer());
    }

    private LoyaltyTransactionResponse transactionResponse(LoyaltyTransaction transaction) {
        return transactionResponse(transaction, null);
    }

    private LoyaltyTransactionResponse transactionResponse(LoyaltyTransaction transaction, String customerName) {
        return new LoyaltyTransactionResponse(transaction.getId(), transaction.getUserId(), customerName, transaction.getTransactionType(),
                transaction.getPointsDelta(), transaction.getAmount(), transaction.getDescription(),
                transaction.getOrderId(), transaction.getExpiresAt(), transaction.getCreatedAt());
    }

    private String displayName(User user) { return user == null ? "Customer" : user.getDisplayName(); }
    private BigDecimal money(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }

    private Instant parseReportDate(String value, boolean endOfDay) {
        if (value == null || value.isBlank()) return null;
        try {
            LocalDate date = LocalDate.parse(value);
            return (endOfDay ? date.plusDays(1) : date).atStartOfDay(REPORT_ZONE).toInstant();
        } catch (java.time.DateTimeException exception) {
            throw invalid("Enter report dates in YYYY-MM-DD format.");
        }
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_LOYALTY_REQUEST", message);
    }

    private ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
