package com.dreamspex.reviews;

import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.net.URI;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.reviews.ReviewDtos.*;

@Service
public class ProductReviewService {
    private static final Set<String> RETURNED_STATUSES =
            Set.of("PICKED_UP", "RECEIVED", "QUALITY_CHECK", "REFUND_PROCESSING", "REFUNDED",
                    "REPLACEMENT_PROCESSING", "REPLACED");

    private final ProductReviewRepository reviews;
    private final OrderRepository orders;
    private final ProductRepository products;
    private final ReturnRequestRepository returnRequests;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;

    public ProductReviewService(ProductReviewRepository reviews, OrderRepository orders,
                                ProductRepository products, ReturnRequestRepository returnRequests,
                                CurrentUser currentUser, ObjectMapper objectMapper) {
        this.reviews = reviews;
        this.orders = orders;
        this.products = products;
        this.returnRequests = returnRequests;
        this.currentUser = currentUser;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public RatingSummary ratingSummary(List<String> productIds) {
        Map<Integer, Long> emptyDistribution = new LinkedHashMap<>();
        for (int rating = 1; rating <= 5; rating++) emptyDistribution.put(rating, 0L);
        if (productIds == null || productIds.isEmpty()) return new RatingSummary(0, 0, emptyDistribution);
        return summarize(reviews.findRatingRows(new LinkedHashSet<>(productIds)));
    }

    @Transactional(readOnly = true)
    public Map<String, RatingSummary> ratingSummaries(List<String> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        Map<String, List<ProductRatingRow>> rowsByProduct = new LinkedHashMap<>();
        reviews.findRatingRows(new LinkedHashSet<>(productIds)).forEach(row ->
                rowsByProduct.computeIfAbsent(row.getProductId(), ignored -> new ArrayList<>()).add(row));
        Map<String, RatingSummary> summaries = new LinkedHashMap<>();
        productIds.stream().distinct().forEach(productId -> summaries.put(productId,
                summarize(rowsByProduct.getOrDefault(productId, List.of()))));
        return summaries;
    }

    @Transactional(readOnly = true)
    public ProductReviewFeed publicReviews(String productId) {
        Product product = products.findByIdAndStatusAndDeletedAtIsNull(productId, "PUBLISHED")
                .orElseThrow(() -> notFound("PRODUCT_NOT_FOUND", "Product was not found."));
        List<ProductReview> publicReviews = reviews.findPublicReviews(product.getId());
        List<PublicReview> visible = publicReviews.stream()
                .filter(review -> "APPROVED".equals(review.getModerationStatus()) && review.getRating() >= 4)
                .map(review -> new PublicReview(
                review.getId(), review.getRating(), review.getTitle(), review.getContent(),
                imageUrls(review), review.getCustomer().getDisplayName(), review.getCreatedAt())).toList();
        return new ProductReviewFeed(ratingSummary(List.of(productId)), visible);
    }

    @Transactional(readOnly = true)
    public List<ReviewEligibility> reviewEligibility(org.springframework.security.core.Authentication authentication,
                                                     String orderId) {
        User customer = currentUser.require(authentication);
        Order order = orders.findByIdAndUserId(orderId, customer.getId())
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        List<ReturnRequest> returns = returnRequests.findByOrderId(orderId);
        Map<String, OrderItem> productsInOrder = new LinkedHashMap<>();
        for (OrderItem item : order.getItems()) {
            productsInOrder.putIfAbsent(item.getVariant().getProduct().getId(), item);
        }
        return productsInOrder.values().stream().map(item -> {
            Product product = item.getVariant().getProduct();
            ProductReview existing = reviews.findByCustomerIdAndOrderIdAndProductId(
                    customer.getId(), order.getId(), product.getId()).orElse(null);
            boolean eligible = completedOrder(order)
                    && !isReturnedProduct(returns, product.getId());
            return eligibility(order, product, eligible, existing);
        }).toList();
    }

    @Transactional
    public ReviewEligibility create(org.springframework.security.core.Authentication authentication,
                                    String orderId, String productId, SubmissionRequest request) {
        User customer = currentUser.require(authentication);
        Order order = orders.findByIdAndUserIdForUpdate(orderId, customer.getId())
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        Product product = purchasedProduct(order, productId);
        assertEligible(order, product, returnRequests.findByOrderId(orderId));
        if (reviews.findByCustomerIdAndOrderIdAndProductId(customer.getId(), orderId, productId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "REVIEW_ALREADY_EXISTS",
                    "A review for this product and order already exists. Edit your existing review instead.");
        }

        ProductReview review = new ProductReview();
        review.setCustomer(customer);
        review.setOrder(order);
        review.setProduct(product);
        apply(review, request);
        ProductReview saved = reviews.save(review);
        return eligibility(order, product, true, saved);
    }

    @Transactional
    public ReviewEligibility update(org.springframework.security.core.Authentication authentication,
                                    String reviewId, SubmissionRequest request) {
        User customer = currentUser.require(authentication);
        ProductReview review = reviews.findById(reviewId)
                .filter(value -> value.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> notFound("REVIEW_NOT_FOUND", "Review was not found."));
        List<ReturnRequest> returns = returnRequests.findByOrderId(review.getOrder().getId());
        assertEligible(review.getOrder(), review.getProduct(), returns);
        apply(review, request);
        review.setModerationStatus("PENDING");
        review.setModeratedBy(null);
        review.setModeratedAt(null);
        review.setUpdatedAt(Instant.now());
        ProductReview saved = reviews.save(review);
        return eligibility(saved.getOrder(), saved.getProduct(), true, saved);
    }

    @Transactional(readOnly = true)
    public AdminReviewResponse adminReviews() {
        List<ProductReview> all = reviews.findAll().stream()
                .sorted(Comparator.comparing(ProductReview::getCreatedAt).reversed()).toList();
        List<AdminReview> mapped = all.stream().map(this::adminReview).toList();
        long pending = countStatus(all, "PENDING");
        long approved = countStatus(all, "APPROVED");
        long hidden = countStatus(all, "HIDDEN");
        long rejected = countStatus(all, "REJECTED");
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int rating = 1; rating <= 5; rating++) distribution.put(rating, 0L);
        List<String> productIds = all.stream().map(review -> review.getProduct().getId()).distinct().toList();
        if (!productIds.isEmpty()) {
            for (ProductRatingRow row : reviews.findRatingRows(productIds)) {
                distribution.merge(row.getRating(), row.getReviewCount(), Long::sum);
            }
        }
        long validReviewCount = distribution.values().stream().mapToLong(Long::longValue).sum();
        return new AdminReviewResponse(mapped,
                new AdminReviewStatistics(all.size(), validReviewCount, pending, approved, hidden, rejected, distribution));
    }

    @Transactional
    public AdminReview moderate(org.springframework.security.core.Authentication authentication,
                                String reviewId, ModerationRequest request) {
        User moderator = currentUser.require(authentication);
        ProductReview review = reviews.findById(reviewId)
                .orElseThrow(() -> notFound("REVIEW_NOT_FOUND", "Review was not found."));
        review.setModerationStatus(request.status());
        review.setModeratedBy(moderator);
        review.setModeratedAt(Instant.now());
        review.setUpdatedAt(Instant.now());
        return adminReview(reviews.save(review));
    }

    private ProductReview apply(ProductReview review, SubmissionRequest request) {
        review.setRating(request.rating());
        review.setTitle(request.title().trim());
        review.setContent(request.content().trim());
        review.setImageUrlsJson(serializeImageUrls(request.imageUrls()));
        review.setModerationStatus("PENDING");
        review.setUpdatedAt(Instant.now());
        return review;
    }

    private String serializeImageUrls(List<String> values) {
        List<String> urls = values == null ? List.of() : values.stream().map(String::trim)
                .filter(value -> !value.isBlank()).distinct().toList();
        if (urls.size() > 5) throw invalid("A review can include up to five images.");
        for (String value : urls) {
            try {
                URI uri = URI.create(value);
                if (!Set.of("http", "https").contains(uri.getScheme())
                        || uri.getHost() == null || value.length() > 1000) {
                    throw invalid("Review images must use valid HTTP or HTTPS image URLs.");
                }
            } catch (IllegalArgumentException exception) {
                throw invalid("Review images must use valid HTTP or HTTPS image URLs.");
            }
        }
        try {
            return objectMapper.writeValueAsString(urls);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Review image URLs could not be stored.", exception);
        }
    }

    private List<String> imageUrls(ProductReview review) {
        if (review.getImageUrlsJson() == null || review.getImageUrlsJson().isBlank()) return List.of();
        try {
            return objectMapper.readValue(review.getImageUrlsJson(), new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored review image URLs could not be read.", exception);
        }
    }

    private Product purchasedProduct(Order order, String productId) {
        return order.getItems().stream().map(item -> item.getVariant().getProduct())
                .filter(product -> product.getId().equals(productId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "PRODUCT_NOT_PURCHASED",
                        "This product was not included in the selected order."));
    }

    private void assertEligible(Order order, Product product, List<ReturnRequest> returns) {
        if (!completedOrder(order)) {
            throw new ApiException(HttpStatus.CONFLICT, "REVIEW_ORDER_NOT_DELIVERED",
                    "Reviews can only be submitted after an order has been delivered or picked up.");
        }
        if (isReturnedProduct(returns, product.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "REVIEW_PRODUCT_RETURNED",
                    "A returned product is not eligible for review.");
        }
    }

    private boolean completedOrder(Order order) {
        return "DELIVERED".equals(order.getStatus())
                || ("PICKED_UP".equals(order.getStatus())
                && ("PICKUP".equals(order.getFulfillmentType()) || "STORE_PICKUP".equals(order.getFulfillmentType())));
    }

    private boolean isReturnedProduct(List<ReturnRequest> returns, String productId) {
        return returns.stream().anyMatch(request -> RETURNED_STATUSES.contains(
                request.getStatus().toUpperCase(Locale.ROOT)) && request.getItems().stream()
                .anyMatch(item -> productId.equals(item.getOrderItem().getVariant().getProduct().getId())));
    }

    private ReviewEligibility eligibility(Order order, Product product, boolean eligible, ProductReview review) {
        return new ReviewEligibility(product.getId(), product.getName(), primaryImage(product), order.getId(),
                order.getOrderNumber(), eligible, review == null ? null : review.getId(),
                review == null ? null : review.getModerationStatus(), review == null ? null : review.getRating(),
                review == null ? null : review.getTitle(), review == null ? null : review.getContent(),
                review == null ? List.of() : imageUrls(review), review == null ? null : review.getCreatedAt());
    }

    private AdminReview adminReview(ProductReview review) {
        User customer = review.getCustomer();
        return new AdminReview(review.getId(), review.getProduct().getId(), review.getProduct().getName(),
                primaryImage(review.getProduct()), review.getOrder().getId(), review.getOrder().getOrderNumber(),
                customer.getId(), customer.getDisplayName(), customer.getEmail(), customer.getPhone(),
                review.getRating(), review.getTitle(), review.getContent(), imageUrls(review),
                review.getModerationStatus(), review.getCreatedAt(), review.getUpdatedAt(), review.getModeratedAt(),
                review.getModeratedBy() == null ? null : review.getModeratedBy().getDisplayName());
    }

    private String primaryImage(Product product) {
        return product.getImages().stream()
                .min(Comparator.comparing(ProductImage::isPrimaryImage).reversed()
                        .thenComparingInt(ProductImage::getSortOrder))
                .map(ProductImage::getImageUrl).orElse(null);
    }

    private RatingSummary summarize(List<ProductRatingRow> rows) {
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int rating = 1; rating <= 5; rating++) distribution.put(rating, 0L);
        long total = 0;
        long weighted = 0;
        for (ProductRatingRow row : rows) {
            distribution.merge(row.getRating(), row.getReviewCount(), Long::sum);
            total += row.getReviewCount();
            weighted += row.getRating() * row.getReviewCount();
        }
        return new RatingSummary(total == 0 ? 0 : (double) weighted / total, total, distribution);
    }

    private long countStatus(List<ProductReview> values, String status) {
        return values.stream().filter(value -> status.equals(value.getModerationStatus())).count();
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REVIEW", message);
    }
}
