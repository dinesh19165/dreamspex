-- Java UUID values are persisted as String fields. Hibernate therefore expects
-- VARCHAR columns during schema validation, not CHAR columns.

ALTER TABLE user_roles
    DROP FOREIGN KEY fk_user_roles_user,
    DROP FOREIGN KEY fk_user_roles_role;
ALTER TABLE refresh_tokens
    DROP FOREIGN KEY fk_refresh_user;
ALTER TABLE otp_challenges
    DROP FOREIGN KEY fk_otp_user;
ALTER TABLE customer_profiles
    DROP FOREIGN KEY fk_customer_profiles_user;
ALTER TABLE addresses
    DROP FOREIGN KEY fk_addresses_user;
ALTER TABLE audit_logs
    DROP FOREIGN KEY fk_audit_actor;
ALTER TABLE product_categories
    DROP FOREIGN KEY fk_product_categories_product,
    DROP FOREIGN KEY fk_product_categories_category;
ALTER TABLE product_variants
    DROP FOREIGN KEY fk_product_variants_product;
ALTER TABLE product_images
    DROP FOREIGN KEY fk_product_images_product,
    DROP FOREIGN KEY fk_product_images_variant;
ALTER TABLE carts
    DROP FOREIGN KEY fk_carts_user;
ALTER TABLE cart_items
    DROP FOREIGN KEY fk_cart_items_cart,
    DROP FOREIGN KEY fk_cart_items_variant;
ALTER TABLE wishlist_items
    DROP FOREIGN KEY fk_wishlist_user,
    DROP FOREIGN KEY fk_wishlist_variant;
ALTER TABLE prescriptions
    DROP FOREIGN KEY fk_prescriptions_user,
    DROP FOREIGN KEY fk_prescriptions_reviewer;
ALTER TABLE prescription_files
    DROP FOREIGN KEY fk_prescription_files_prescription;
ALTER TABLE memberships
    DROP FOREIGN KEY fk_memberships_user,
    DROP FOREIGN KEY fk_memberships_plan;
ALTER TABLE notifications
    DROP FOREIGN KEY fk_notifications_user;
ALTER TABLE orders
    DROP FOREIGN KEY fk_orders_user,
    DROP FOREIGN KEY fk_orders_address;
ALTER TABLE order_items
    DROP FOREIGN KEY fk_order_items_order,
    DROP FOREIGN KEY fk_order_items_variant;
ALTER TABLE order_status_history
    DROP FOREIGN KEY fk_order_history_order,
    DROP FOREIGN KEY fk_order_history_user;
ALTER TABLE payments
    DROP FOREIGN KEY fk_payments_order;
ALTER TABLE homepage_content
    DROP FOREIGN KEY fk_homepage_content_user;

ALTER TABLE users
    MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE roles MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE user_roles
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY role_id VARCHAR(255) NOT NULL;
ALTER TABLE refresh_tokens
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY family_id VARCHAR(255) NOT NULL,
    MODIFY replaced_by_id VARCHAR(255) NULL,
    MODIFY created_ip_hash VARCHAR(255) NULL,
    MODIFY user_agent_hash VARCHAR(255) NULL;
ALTER TABLE otp_challenges
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NULL,
    MODIFY code_hash VARCHAR(255) NOT NULL;
ALTER TABLE customer_profiles
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL;
ALTER TABLE addresses
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY country_code VARCHAR(255) NOT NULL;
ALTER TABLE audit_logs
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY actor_user_id VARCHAR(255) NULL,
    MODIFY resource_id VARCHAR(255) NULL;
ALTER TABLE categories MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE products MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE product_categories
    MODIFY product_id VARCHAR(255) NOT NULL,
    MODIFY category_id VARCHAR(255) NOT NULL;
ALTER TABLE product_variants
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY product_id VARCHAR(255) NOT NULL;
ALTER TABLE product_images
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY product_id VARCHAR(255) NOT NULL,
    MODIFY variant_id VARCHAR(255) NULL;
ALTER TABLE carts
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL;
ALTER TABLE cart_items
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY cart_id VARCHAR(255) NOT NULL,
    MODIFY variant_id VARCHAR(255) NOT NULL;
ALTER TABLE wishlist_items
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY variant_id VARCHAR(255) NOT NULL;
ALTER TABLE coupons MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE prescriptions
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY reviewed_by VARCHAR(255) NULL;
ALTER TABLE prescription_files
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY prescription_id VARCHAR(255) NOT NULL;
ALTER TABLE membership_plans MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE memberships
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY plan_id VARCHAR(255) NOT NULL;
ALTER TABLE notifications
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL;
ALTER TABLE orders
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY user_id VARCHAR(255) NOT NULL,
    MODIFY address_id VARCHAR(255) NOT NULL;
ALTER TABLE order_items
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY order_id VARCHAR(255) NOT NULL,
    MODIFY variant_id VARCHAR(255) NOT NULL;
ALTER TABLE order_status_history
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY order_id VARCHAR(255) NOT NULL,
    MODIFY changed_by VARCHAR(255) NULL;
ALTER TABLE payments
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY order_id VARCHAR(255) NOT NULL,
    MODIFY currency VARCHAR(255) NOT NULL;
ALTER TABLE payment_webhook_events
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY payload_hash VARCHAR(255) NOT NULL;
ALTER TABLE banners MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE homepage_content
    MODIFY id VARCHAR(255) NOT NULL,
    MODIFY updated_by VARCHAR(255) NULL;
ALTER TABLE stores MODIFY id VARCHAR(255) NOT NULL;
ALTER TABLE services MODIFY id VARCHAR(255) NOT NULL;

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE otp_challenges
    ADD CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customer_profiles
    ADD CONSTRAINT fk_customer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE addresses
    ADD CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE product_categories
    ADD CONSTRAINT fk_product_categories_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_product_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE product_variants
    ADD CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE product_images
    ADD CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_product_images_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE carts
    ADD CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;
ALTER TABLE wishlist_items
    ADD CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_wishlist_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
ALTER TABLE prescriptions
    ADD CONSTRAINT fk_prescriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_prescriptions_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE prescription_files
    ADD CONSTRAINT fk_prescription_files_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE;
ALTER TABLE memberships
    ADD CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_memberships_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT;
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE RESTRICT;
ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;
ALTER TABLE order_status_history
    ADD CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_order_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments
    ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
ALTER TABLE homepage_content
    ADD CONSTRAINT fk_homepage_content_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
