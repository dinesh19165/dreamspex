package com.dreamspex.reviews;

import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestItem;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import static com.dreamspex.reviews.ReviewDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class ProductReviewServiceTest {
    @Mock ProductReviewRepository reviews;
    @Mock OrderRepository orders;
    @Mock ProductRepository products;
    @Mock ReturnRequestRepository returnRequests;
    @Mock CurrentUser currentUser;
    @Mock Authentication authentication;

    private ProductReviewService service;
    private User customer;
    private Order order;
    private Product product;

    @BeforeEach
    void setUp() {
        service = new ProductReviewService(reviews, orders, products, returnRequests, currentUser,
                new ObjectMapper());
        customer = new User();
        customer.setDisplayName("Customer One");
        order = new Order();
        order.setOrderNumber("DS-ORDER-1");
        order.setStatus("DELIVERED");
        product = new Product();
        product.setName("Aviator Frame");
        product.setStatus("PUBLISHED");
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setVariant(variant);
        order.getItems().add(item);
        lenient().when(currentUser.require(authentication)).thenReturn(customer);
    }

    @Test
    void deliveredPurchasedProductCanBeReviewed() {
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(returnRequests.findByOrderId(order.getId())).thenReturn(List.of());
        when(reviews.findByCustomerIdAndOrderIdAndProductId(customer.getId(), order.getId(), product.getId()))
                .thenReturn(Optional.empty());
        when(reviews.save(any(ProductReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewEligibility result = service.create(authentication, order.getId(), product.getId(),
                new SubmissionRequest(5, "Excellent fit", "Comfortable and lightweight.", List.of()));

        assertTrue(result.eligible());
        assertEquals(5, result.rating());
        assertEquals("PENDING", result.moderationStatus());
        verify(reviews).save(any(ProductReview.class));
    }

    @Test
    void processingOrderCannotBeReviewed() {
        order.setStatus("PROCESSING");
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(returnRequests.findByOrderId(order.getId())).thenReturn(List.of());

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                product.getId(), new SubmissionRequest(4, "Good", "Feedback", List.of())));

        assertEquals("REVIEW_ORDER_NOT_DELIVERED", error.code());
        verify(reviews, never()).save(any());
    }

    @Test
    void duplicateReviewForProductAndOrderIsBlocked() {
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(returnRequests.findByOrderId(order.getId())).thenReturn(List.of());
        when(reviews.findByCustomerIdAndOrderIdAndProductId(customer.getId(), order.getId(), product.getId()))
                .thenReturn(Optional.of(new ProductReview()));

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                product.getId(), new SubmissionRequest(4, "Good", "Feedback", List.of())));

        assertEquals(HttpStatus.CONFLICT, error.status());
        assertEquals("REVIEW_ALREADY_EXISTS", error.code());
    }

    @Test
    void customerCannotReviewAnotherCustomersOrder() {
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                product.getId(), new SubmissionRequest(4, "Good", "Feedback", List.of())));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
        verify(reviews, never()).save(any());
    }

    @Test
    void returnedProductCannotBeReviewed() {
        ReturnRequest request = new ReturnRequest();
        request.setStatus("REPLACED");
        ReturnRequestItem returnedItem = new ReturnRequestItem();
        returnedItem.setOrderItem(order.getItems().get(0));
        request.getItems().add(returnedItem);
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(returnRequests.findByOrderId(order.getId())).thenReturn(List.of(request));

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                product.getId(), new SubmissionRequest(4, "Good", "Feedback", List.of())));

        assertEquals("REVIEW_PRODUCT_RETURNED", error.code());
        verify(reviews, never()).save(any());
    }

    @Test
    void ratingAverageAndDistributionIncludeEveryNonRejectedRating() {
        List<ProductRatingRow> rows = List.of(
                row(product.getId(), 1, 1), row(product.getId(), 3, 1),
                row(product.getId(), 4, 2), row(product.getId(), 5, 1));
        when(reviews.findRatingRows(anyCollection())).thenReturn(rows);

        RatingSummary result = service.ratingSummary(List.of(product.getId()));

        assertEquals(3.4, result.averageRating(), 0.001);
        assertEquals(5, result.totalReviews());
        assertEquals(Map.of(1, 1L, 2, 0L, 3, 1L, 4, 2L, 5, 1L), result.distribution());
    }

    @Test
    void onlyApprovedFourAndFiveStarReviewsArePublic() {
        ProductReview approved = review(5, "APPROVED");
        ProductReview approvedFourStar = review(4, "APPROVED");
        ProductReview privateLowRating = review(3, "APPROVED");
        ProductReview pending = review(5, "PENDING");
        when(products.findByIdAndStatusAndDeletedAtIsNull(product.getId(), "PUBLISHED"))
                .thenReturn(Optional.of(product));
        when(reviews.findPublicReviews(product.getId()))
                .thenReturn(List.of(approved, approvedFourStar, privateLowRating, pending));
        List<ProductRatingRow> ratingRows = List.of(row(product.getId(), 3, 1),
                row(product.getId(), 4, 1), row(product.getId(), 5, 1));
        when(reviews.findRatingRows(anyCollection())).thenReturn(ratingRows);

        ProductReviewFeed result = service.publicReviews(product.getId());

        assertEquals(2, result.reviews().size());
        assertEquals(List.of(5, 4), result.reviews().stream().map(PublicReview::rating).toList());
        assertEquals(4, result.summary().averageRating());
    }

    @Test
    void adminCanModerateReviews() {
        ProductReview review = review(4, "PENDING");
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));
        when(reviews.save(review)).thenReturn(review);

        AdminReview result = service.moderate(authentication, review.getId(), new ModerationRequest("APPROVED"));

        assertEquals("APPROVED", result.moderationStatus());
        assertNotNull(result.moderatedAt());
    }

    private ProductReview review(int rating, String status) {
        ProductReview review = new ProductReview();
        review.setCustomer(customer);
        review.setOrder(order);
        review.setProduct(product);
        review.setRating(rating);
        review.setTitle("Review");
        review.setContent("Feedback");
        review.setModerationStatus(status);
        return review;
    }

    private ProductRatingRow row(String productId, int rating, long count) {
        ProductRatingRow row = mock(ProductRatingRow.class);
        lenient().when(row.getProductId()).thenReturn(productId);
        lenient().when(row.getRating()).thenReturn(rating);
        lenient().when(row.getReviewCount()).thenReturn(count);
        return row;
    }
}
