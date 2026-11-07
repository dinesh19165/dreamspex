package com.dreamspex.admin;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.audit.AuditLogRepository;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.notification.NotificationRepository;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.payment.PaymentRepository;
import com.dreamspex.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminCustomersTest {
    @Mock CurrentUser current;
    @Mock UserRepository users;
    @Mock ProductRepository products;
    @Mock ProductVariantRepository variants;
    @Mock CategoryRepository categories;
    @Mock CouponRepository coupons;
    @Mock OrderRepository orders;
    @Mock PaymentRepository payments;
    @Mock NotificationService notifications;
    @Mock NotificationRepository notificationRepository;
    @Mock AuditLogRepository audit;
    @Mock AuditLogService auditService;
    @Mock BannerRepository banners;
    @Mock HomepageContentRepository content;
    @Mock StoreRepository stores;
    @Mock ServiceOfferingRepository services;
    @InjectMocks AdminOperationsService service;

    @Test
    void returnsCustomerFieldsOrderCountAndContactSearch() {
        User user = new User();
        user.setDisplayName("Jane Customer");
        user.setEmail("jane@example.com");
        user.setPhone("+919876543210");
        user.setStatus("ACTIVE");

        when(users.searchByRoleAndContact(eq("CUSTOMER"), eq("jane@example.com"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(user)));
        when(orders.countByUserId(user.getId())).thenReturn(3L);

        AdminDtos.CustomerPage page = service.customers("jane@example.com", 0, 25);

        assertEquals(1, page.total());
        assertEquals("Jane Customer", page.items().get(0).displayName());
        assertEquals("jane@example.com", page.items().get(0).email());
        assertEquals("+919876543210", page.items().get(0).phone());
        assertEquals(3L, page.items().get(0).orderCount());
        verify(users).searchByRoleAndContact(eq("CUSTOMER"), eq("jane@example.com"), any(Pageable.class));
    }
}
