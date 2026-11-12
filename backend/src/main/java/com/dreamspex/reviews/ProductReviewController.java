package com.dreamspex.reviews;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import static com.dreamspex.reviews.ReviewDtos.*;

@RestController
@RequestMapping("/api/v1")
public class ProductReviewController {
    private final ProductReviewService service;

    public ProductReviewController(ProductReviewService service) {
        this.service = service;
    }

    @GetMapping("/products/{productId}/reviews")
    ProductReviewFeed publicReviews(@PathVariable String productId) {
        return service.publicReviews(productId);
    }

    @GetMapping("/me/orders/{orderId}/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    List<ReviewEligibility> eligibility(Authentication authentication, @PathVariable String orderId) {
        return service.reviewEligibility(authentication, orderId);
    }

    @PostMapping("/me/orders/{orderId}/products/{productId}/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    ReviewEligibility create(Authentication authentication, @PathVariable String orderId,
                             @PathVariable String productId, @Valid @RequestBody SubmissionRequest request) {
        return service.create(authentication, orderId, productId, request);
    }

    @PutMapping("/me/product-reviews/{reviewId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    ReviewEligibility update(Authentication authentication, @PathVariable String reviewId,
                             @Valid @RequestBody SubmissionRequest request) {
        return service.update(authentication, reviewId, request);
    }

    @GetMapping("/admin/product-reviews")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    AdminReviewResponse adminReviews() {
        return service.adminReviews();
    }

    @PatchMapping("/admin/product-reviews/{reviewId}/moderation")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    AdminReview moderate(Authentication authentication, @PathVariable String reviewId,
                         @Valid @RequestBody ModerationRequest request) {
        return service.moderate(authentication, reviewId, request);
    }
}
