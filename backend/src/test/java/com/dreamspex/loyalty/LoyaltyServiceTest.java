package com.dreamspex.loyalty;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.security.CurrentUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceTest {
    @Mock private CurrentUser current;
    @Mock private UserRepository users;
    @Mock private OrderRepository orders;
    @Mock private LoyaltySettingsRepository settingsRepository;
    @Mock private ReferralSettingsRepository referralSettingsRepository;
    @Mock private LoyaltyAccountRepository accounts;
    @Mock private LoyaltyTransactionRepository transactions;
    @Mock private LoyaltyPointLotRepository lots;
    @Mock private ReferralCodeRepository codes;
    @Mock private ReferralRepository referrals;
    @Mock private WalletAccountRepository wallets;
    @Mock private WalletTransactionRepository walletTransactions;
    @Mock private AuditLogService auditLogs;
    private LoyaltyService service;
    private LoyaltySettings settings;

    @BeforeEach
    void setUp() {
        service = new LoyaltyService(current, users, orders, settingsRepository, referralSettingsRepository,
                accounts, transactions, lots, codes, referrals, wallets, walletTransactions, auditLogs);
        settings = new LoyaltySettings();
        Mockito.lenient().when(settingsRepository.findById(1)).thenReturn(Optional.of(settings));
        Mockito.lenient().when(lots.findByExpiresAtLessThanEqualAndRemainingPointsGreaterThan(any(), any(Long.class)))
                .thenReturn(List.of());
    }

    @Test
    void validatesRedemptionValueAndOrderCap() {
        LoyaltyAccount account = new LoyaltyAccount("customer-1");
        account.setAvailablePoints(5000);
        when(accounts.findById("customer-1")).thenReturn(Optional.of(account));

        LoyaltyDtos.RedemptionPreview preview = service.preview("customer-1", 300, new BigDecimal("1000.00"));

        assertEquals(2000, preview.maximumRedeemablePoints());
        assertEquals(300, preview.requestedPoints());
        assertEquals(new BigDecimal("30.00"), preview.discount());
        assertThrows(ApiException.class,
                () -> service.preview("customer-1", 2001, new BigDecimal("1000.00")));
    }

    @Test
    void redemptionConsumesPointsAndCreatesAnIdempotentLedgerEntry() {
        LoyaltyAccount account = new LoyaltyAccount("customer-1");
        account.setAvailablePoints(250);
        LoyaltyPointLot lot = new LoyaltyPointLot();
        lot.setUserId("customer-1");
        lot.setRemainingPoints(250);
        when(accounts.findById("customer-1")).thenReturn(Optional.of(account));
        when(accounts.findByUserIdForUpdate("customer-1")).thenReturn(Optional.of(account));
        when(lots.findSpendableForUpdate(anyString(), any())).thenReturn(List.of(lot));
        when(transactions.findByReferenceKey(anyString())).thenReturn(Optional.empty());
        when(transactions.save(any(LoyaltyTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoyaltyDtos.RedemptionPreview preview = service.redeemForOrder("customer-1", "order-1", 100,
                new BigDecimal("1000.00"));

        assertEquals(new BigDecimal("10.00"), preview.discount());
        assertEquals(150, account.getAvailablePoints());
        assertEquals(100, account.getTotalRedeemed());
        assertEquals(150, lot.getRemainingPoints());
        verify(transactions).save(org.mockito.ArgumentMatchers.argThat(transaction ->
                transaction.getPointsDelta() == -100 && "REDEMPTION".equals(transaction.getTransactionType())
                        && "ORDER:order-1:REDEMPTION".equals(transaction.getReferenceKey())));
    }

    @Test
    void deliveredReferralCreditsBothPartiesOnlyOnce() {
        settings.setPointsPerHundred(0);
        ReferralSettings referralSettings = new ReferralSettings();
        referralSettings.setEnabled(true);
        referralSettings.setRewardType("LOYALTY_POINTS");
        referralSettings.setReferrerRewardAmount(100);
        referralSettings.setNewCustomerRewardAmount(50);
        referralSettings.setMinimumPurchaseAmount(new BigDecimal("500.00"));
        when(referralSettingsRepository.findById(1)).thenReturn(Optional.of(referralSettings));

        User customer = new User();
        User referrer = new User();
        Referral referral = new Referral();
        referral.setReferrerId(referrer.getId());
        referral.setReferredUserId(customer.getId());
        when(referrals.findByReferredUserIdForUpdate(customer.getId())).thenReturn(Optional.of(referral));
        when(referrals.countByReferrerIdAndStatus(referrer.getId(), "SUCCESSFUL")).thenReturn(0L);

        LoyaltyAccount referrerAccount = new LoyaltyAccount(referrer.getId());
        LoyaltyAccount customerAccount = new LoyaltyAccount(customer.getId());
        when(accounts.findByUserIdForUpdate(referrer.getId())).thenReturn(Optional.of(referrerAccount));
        when(accounts.findByUserIdForUpdate(customer.getId())).thenReturn(Optional.of(customerAccount));
        when(transactions.findByReferenceKey(anyString())).thenReturn(Optional.empty());
        when(transactions.save(any(LoyaltyTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(lots.save(any(LoyaltyPointLot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order order = new Order();
        order.setUser(customer);
        order.setStatus("DELIVERED");
        order.setPaymentStatus("PAID");
        order.setTotalAmount(new BigDecimal("1000.00"));
        order.setLoyaltyDiscountAmount(BigDecimal.ZERO);

        service.processDeliveredOrder(order);
        service.processDeliveredOrder(order);

        assertEquals("SUCCESSFUL", referral.getStatus());
        assertEquals(100, referrerAccount.getAvailablePoints());
        assertEquals(50, customerAccount.getAvailablePoints());
        verify(transactions, org.mockito.Mockito.times(2)).save(any(LoyaltyTransaction.class));
        verify(referrals, never()).save(any(Referral.class));
    }

    @Test
    void doesNotAwardPointsForUndeliveredOrUnpaidOrders() {
        Order order = new Order();
        order.setStatus("CANCELLED");
        order.setPaymentStatus("FAILED");

        service.processDeliveredOrder(order);

        verify(transactions, never()).save(any(LoyaltyTransaction.class));
        verify(referrals, never()).findByReferredUserIdForUpdate(anyString());
    }
}
