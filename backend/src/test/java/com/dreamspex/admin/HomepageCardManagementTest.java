package com.dreamspex.admin;


import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static com.dreamspex.admin.HomepageCmsDtos.*;

class HomepageCardManagementTest {
    private final BannerRepository banners = mock(BannerRepository.class);
    private final HomepageSectionRepository sections = mock(HomepageSectionRepository.class);
    private final HomepageCardRepository cards = mock(HomepageCardRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final CurrentUser current = mock(CurrentUser.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final User actor = new User();
    private final UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken("admin", null);
    private final HomepageCmsService service = new HomepageCmsService(
            banners, sections, cards, products, categories, current, audit, Optional.empty());

    @BeforeEach
    void setUp() {
        when(current.require(authentication)).thenReturn(actor);
    }

    @Test
    void createsTrendingCardUsingPublishedCatalogueProduct() {
        Product product = publishedProduct();
        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setPrimaryImage(true);
        image.setImageUrl("/catalog/frame.jpg");
        product.getImages().add(image);
        when(products.findByIdAndStatusAndDeletedAtIsNull(product.getId(), "PUBLISHED")).thenReturn(Optional.of(product));
        when(cards.save(any(HomepageCard.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HomepageCardResponse result = service.saveCard(authentication, null, request(
                "TRENDING_PRODUCT", "PRODUCT", product.getId(), true, "PUBLISHED", 2));

        assertEquals(product.getId(), result.product().id());
        assertEquals(new BigDecimal("125.00"), result.product().price());
        assertEquals("/catalog/frame.jpg", result.product().imageUrl());
        assertEquals(2, result.displayOrder());
        verify(audit).record(actor, "CMS_CARD_CREATED", "HOMEPAGE_CARD", result.id());
    }

    @Test
    void editsCardStatusEnabledStateAndDisplayOrder() {
        Product product = publishedProduct();
        HomepageCard existing = new HomepageCard();
        when(cards.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(products.findByIdAndStatusAndDeletedAtIsNull(product.getId(), "PUBLISHED")).thenReturn(Optional.of(product));
        when(cards.save(existing)).thenReturn(existing);

        HomepageCardResponse result = service.saveCard(authentication, existing.getId(), request(
                "TRENDING_PRODUCT", "PRODUCT", product.getId(), false, "INACTIVE", 7));

        assertFalse(result.enabled());
        assertEquals("INACTIVE", result.status());
        assertEquals(7, result.displayOrder());
        verify(audit).record(actor, "CMS_CARD_UPDATED", "HOMEPAGE_CARD", existing.getId());
    }

    @Test
    void rejectsCategoryCardsWithNonCategoryDestination() {
        ApiException error = assertThrows(ApiException.class, () -> service.saveCard(authentication, null,
                request("CATEGORY_BANNER", "PAGE", "/shop", true, "PUBLISHED", 0)));

        assertEquals("INVALID_HOMEPAGE_CARD", error.code());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
        verify(cards, never()).save(any());
    }

    @Test
    void rejectsExternalHomepagePageDestinations() {
        ApiException error = assertThrows(ApiException.class, () -> service.saveCard(authentication, null,
                request("PROMOTIONAL", "PAGE", "//example.com", true, "PUBLISHED", 0)));

        assertEquals("INVALID_HOMEPAGE_CARD", error.code());
        verify(cards, never()).save(any());
    }

    @Test
    void validatesPaginationBounds() {
        ApiException error = assertThrows(ApiException.class, () -> service.pageCards(null, 0, 101));
        assertEquals("INVALID_PAGINATION", error.code());
    }

    @Test
    void deletesCardAfterAuthorizationContextIsResolved() {
        String id = "card-id";
        when(cards.existsById(id)).thenReturn(true);

        service.deleteCard(authentication, id);

        verify(cards).deleteById(id);
        verify(audit).record(actor, "CMS_CARD_DELETED", "HOMEPAGE_CARD", id);
    }

    private HomepageCardRequest request(String section, String destinationType, String destinationValue,
                                        boolean enabled, String status, int order) {
        return new HomepageCardRequest(section, "Featured frames", "Discover", "A curated selection",
                null, null, "Explore", destinationType, destinationValue, order, status, enabled);
    }

    private Product publishedProduct() {
        Product product = new Product();
        product.setName("Classic Frame");
        product.setSlug("classic-frame");
        product.setBrand("Dream Brand");
        product.setDescription("Everyday frame");
        product.setBasePrice(new BigDecimal("125.00"));
        product.setStatus("PUBLISHED");
        return product;
    }
}
