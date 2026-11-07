package com.dreamspex.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@JdbcTest
@Import(AdminReportsRepository.class)
@ActiveProfiles("test")
class AdminReportsRepositoryTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AdminReportsRepository reports;

    @BeforeEach
    void createSchema() {
        jdbc.execute("CREATE TABLE orders (id VARCHAR(40), user_id VARCHAR(40), status VARCHAR(32), payment_status VARCHAR(32), total_amount DECIMAL(12,2), created_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE return_refund_transactions (status VARCHAR(32), amount DECIMAL(12,2), processed_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE users (id VARCHAR(40), deleted_at TIMESTAMP, created_at TIMESTAMP)");
        jdbc.execute("CREATE TABLE user_roles (user_id VARCHAR(40), role_id VARCHAR(40))");
        jdbc.execute("CREATE TABLE roles (id VARCHAR(40), code VARCHAR(32))");
        jdbc.execute("CREATE TABLE order_items (order_id VARCHAR(40), variant_id VARCHAR(40), product_name_snapshot VARCHAR(180), quantity INT, line_total DECIMAL(12,2))");
        jdbc.execute("CREATE TABLE product_variants (id VARCHAR(40), product_id VARCHAR(40), status VARCHAR(24), quantity INT, reserved_quantity INT)");
        jdbc.execute("CREATE TABLE products (id VARCHAR(40), name VARCHAR(180), sku VARCHAR(80), deleted_at TIMESTAMP, status VARCHAR(24))");
        jdbc.execute("CREATE TABLE product_categories (product_id VARCHAR(40), category_id VARCHAR(40), is_primary BOOLEAN)");
        jdbc.execute("CREATE TABLE categories (id VARCHAR(40), name VARCHAR(120))");
        jdbc.execute("CREATE TABLE return_requests (status VARCHAR(32), created_at TIMESTAMP)");
    }

    @Test
    void aggregatesPaidSalesRefundsCustomersProductsAndReturnsFromSelectedDates() {
        LocalDate today = LocalDate.now();
        Timestamp createdAt = Timestamp.valueOf(today.atTime(12, 0));
        String customerId = UUID.randomUUID().toString();
        String productId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO roles VALUES ('customer-role', 'CUSTOMER')");
        jdbc.update("INSERT INTO users VALUES (?, NULL, ?)", customerId, createdAt);
        jdbc.update("INSERT INTO user_roles VALUES (?, 'customer-role')", customerId);
        jdbc.update("INSERT INTO orders VALUES ('paid-1', ?, 'DELIVERED', 'PAID', 100.00, ?)", customerId, createdAt);
        jdbc.update("INSERT INTO orders VALUES ('paid-2', ?, 'PAID', 'PAID', 50.00, ?)", customerId, createdAt);
        jdbc.update("INSERT INTO orders VALUES ('pending', ?, 'PENDING_PAYMENT', 'PENDING', 80.00, ?)", customerId, createdAt);
        jdbc.update("INSERT INTO orders VALUES ('cancelled', ?, 'CANCELLED', 'PAID', 200.00, ?)", customerId, createdAt);
        jdbc.update("INSERT INTO return_refund_transactions VALUES ('PROCESSED', 20.00, ?)", createdAt);
        jdbc.update("INSERT INTO return_refund_transactions VALUES ('FAILED', 30.00, ?)", createdAt);
        jdbc.update("INSERT INTO return_requests VALUES ('APPROVED', ?)", createdAt);
        jdbc.update("INSERT INTO return_requests VALUES ('REJECTED', ?)", createdAt);
        jdbc.update("INSERT INTO products VALUES (?, 'Test Frame', 'TEST-1', NULL, 'PUBLISHED')", productId);
        jdbc.update("INSERT INTO product_variants VALUES ('variant-1', ?, 'ACTIVE', 4, 1)", productId);
        jdbc.update("INSERT INTO order_items VALUES ('paid-1', 'variant-1', 'Test Frame', 2, 100.00)");
        jdbc.update("INSERT INTO product_categories VALUES (?, 'category-1', TRUE)", productId);
        jdbc.update("INSERT INTO categories VALUES ('category-1', 'Frames')");

        assertEquals(new BigDecimal("150.00"), reports.paidRevenue(today, today));
        assertEquals(new BigDecimal("20.00"), reports.processedRefunds(today, today));
        assertEquals(4L, ((Number) reports.orderSummary(today, today).get("total")).longValue());
        assertEquals(1L, reports.totalCustomers());
        assertEquals(1L, reports.newCustomers(today, today));
        assertEquals(1L, reports.repeatCustomers(today, today));
        assertEquals(1, reports.revenueTrend(today, today).size());
        assertEquals(1, reports.bestSelling(today, today).size());
        assertEquals(1, reports.categorySales(today, today).size());
        assertEquals(1L, reports.lowStockProducts().get(0).lowStockVariants());
        assertEquals(2L, ((Number) reports.returnSummary(today, today).get("total")).longValue());
        assertEquals(1L, reports.processedRefundCount(today, today));
    }
}
