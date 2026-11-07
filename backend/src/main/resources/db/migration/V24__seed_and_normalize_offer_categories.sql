ALTER TABLE categories
    ADD COLUMN category_type VARCHAR(24) NOT NULL DEFAULT 'CATALOG';

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), 'Today''s Offers', 'offer-todays-offers', NULL, NULL, 'ACTIVE', 100, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'offer-todays-offers');

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), 'New Customer Offers', 'offer-new-customer-offers', NULL, NULL, 'ACTIVE', 110, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'offer-new-customer-offers');

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), 'Premium Collection Offers', 'offer-premium-collection-offers', NULL, NULL, 'ACTIVE', 120, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'offer-premium-collection-offers');

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), 'Membership Offers', 'offer-membership-offers', NULL, NULL, 'ACTIVE', 130, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'offer-membership-offers');

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), 'Coupon Offers', 'offer-coupon-offers', NULL, NULL, 'ACTIVE', 140, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'offer-coupon-offers');

INSERT INTO categories (id, name, slug, description, image_url, status, sort_order, created_at, updated_at, category_type)
SELECT UUID(), REPLACE(legacy.offer_category, '_', ' '),
       CONCAT('offer-', LOWER(REPLACE(REPLACE(TRIM(legacy.offer_category), '_', '-'), ' ', '-'))),
       NULL, NULL, 'ACTIVE', 150, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), 'OFFER'
FROM (SELECT DISTINCT offer_category FROM coupons) legacy
LEFT JOIN categories existing_category
    ON existing_category.slug = CONCAT('offer-', LOWER(REPLACE(REPLACE(TRIM(legacy.offer_category), '_', '-'), ' ', '-')))
WHERE existing_category.id IS NULL
  AND TRIM(legacy.offer_category) <> '';

UPDATE coupons coupon
JOIN categories offer_category
    ON offer_category.slug = CONCAT('offer-', LOWER(REPLACE(REPLACE(TRIM(coupon.offer_category), '_', '-'), ' ', '-')))
SET coupon.offer_category = offer_category.slug;
