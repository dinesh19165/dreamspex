package com.dreamspex.reviews;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ReviewDtos {
    private ReviewDtos() {}

    public record SubmissionRequest(
            @NotNull @Min(1) @Max(5) Integer rating,
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 3000) String content,
            @Size(max = 5) List<@NotBlank @Size(max = 1000) String> imageUrls) {}

    public record ModerationRequest(
            @NotBlank @jakarta.validation.constraints.Pattern(regexp = "APPROVED|HIDDEN|REJECTED") String status) {}

    public record RatingSummary(double averageRating, long totalReviews, Map<Integer, Long> distribution) {}

    public record ReviewEligibility(
            String productId, String productName, String productImageUrl, String orderId, String orderNumber,
            boolean eligible, String reviewId, String moderationStatus, Integer rating, String title, String content,
            List<String> imageUrls, Instant submittedAt) {}

    public record PublicReview(
            String id, int rating, String title, String content, List<String> imageUrls,
            String customerName, Instant submittedAt) {}

    public record ProductReviewFeed(RatingSummary summary, List<PublicReview> reviews) {}

    public record AdminReview(
            String id, String productId, String productName, String productImageUrl, String orderId, String orderNumber,
            String customerId, String customerName, String customerEmail, String customerPhone, int rating,
            String title, String content, List<String> imageUrls, String moderationStatus,
            Instant submittedAt, Instant updatedAt, Instant moderatedAt, String moderatorName) {}

    public record AdminReviewStatistics(long totalReviews, long validReviewCount, long pendingReviews, long approvedReviews,
                                        long hiddenReviews, long rejectedReviews, Map<Integer, Long> distribution) {}

    public record AdminReviewResponse(List<AdminReview> reviews, AdminReviewStatistics statistics) {}

    public interface ProductRatingRow {
        String getProductId();
        int getRating();
        long getReviewCount();
    }
}
