package com.dreamspex.reviews;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductReviewRepository extends JpaRepository<ProductReview, String> {
    Optional<ProductReview> findByCustomerIdAndOrderIdAndProductId(String customerId, String orderId, String productId);

    @Query("""
            select review from ProductReview review
            where review.product.id = :productId
              and review.moderationStatus = 'APPROVED'
              and review.rating >= 4
              and (review.order.status = 'DELIVERED'
                   or (review.order.status = 'PICKED_UP' and review.order.fulfillmentType in ('PICKUP', 'STORE_PICKUP')))
              and not exists (
                  select returned.id from ReturnRequestItem returned
                  where returned.orderItem.order.id = review.order.id
                    and returned.orderItem.variant.product.id = review.product.id
                    and returned.returnRequest.status in
                      ('PICKED_UP', 'RECEIVED', 'QUALITY_CHECK', 'REFUND_PROCESSING', 'REFUNDED',
                       'REPLACEMENT_PROCESSING', 'REPLACED')
              )
            order by review.createdAt desc
            """)
    List<ProductReview> findPublicReviews(@Param("productId") String productId);

    @Query("""
            select review.product.id as productId, review.rating as rating, count(review.id) as reviewCount
            from ProductReview review
            where review.product.id in :productIds
              and review.moderationStatus <> 'REJECTED'
              and (review.order.status = 'DELIVERED'
                   or (review.order.status = 'PICKED_UP' and review.order.fulfillmentType in ('PICKUP', 'STORE_PICKUP')))
              and not exists (
                  select returned.id from ReturnRequestItem returned
                  where returned.orderItem.order.id = review.order.id
                    and returned.orderItem.variant.product.id = review.product.id
                    and returned.returnRequest.status in
                      ('PICKED_UP', 'RECEIVED', 'QUALITY_CHECK', 'REFUND_PROCESSING', 'REFUNDED',
                       'REPLACEMENT_PROCESSING', 'REPLACED')
              )
            group by review.product.id, review.rating
            """)
    List<ReviewDtos.ProductRatingRow> findRatingRows(@Param("productIds") Collection<String> productIds);
}
