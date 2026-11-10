package com.dreamspex.admin;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminReportsRepository {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private final JdbcTemplate jdbc;

    public AdminReportsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public BigDecimal paidRevenue(LocalDate start, LocalDate end) {
        return decimal(jdbc.queryForObject("""
                SELECT COALESCE(SUM(total_amount), 0)
                FROM orders
                WHERE payment_status = 'PAID' AND status <> 'CANCELLED'
                  AND created_at >= ? AND created_at < ?
                """, BigDecimal.class, timestamp(start), timestamp(end.plusDays(1))));
    }

    public BigDecimal processedRefunds(LocalDate start, LocalDate end) {
        return decimal(jdbc.queryForObject("""
                SELECT COALESCE(SUM(amount), 0)
                FROM return_refund_transactions
                WHERE status = 'PROCESSED' AND processed_at >= ? AND processed_at < ?
                """, BigDecimal.class, timestamp(start), timestamp(end.plusDays(1))));
    }

    public Map<String, Object> orderSummary(LocalDate start, LocalDate end) {
        return jdbc.queryForMap("""
                SELECT COUNT(*) AS total,
                       SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid,
                       SUM(CASE WHEN status = 'PENDING_PAYMENT' THEN 1 ELSE 0 END) AS pending,
                       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
                       SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
                       COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND status <> 'CANCELLED' THEN discount_amount ELSE 0 END), 0) AS discounts,
                       COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND status <> 'CANCELLED'
                           THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(gst_snapshot, '$.gstAmount')) AS DECIMAL(12,2))
                           ELSE 0 END), 0) AS gst_collected,
                       COALESCE(AVG(CASE WHEN payment_status = 'PAID' AND status <> 'CANCELLED' THEN total_amount END), 0) AS average_order_value
                FROM orders
                WHERE created_at >= ? AND created_at < ?
                """, timestamp(start), timestamp(end.plusDays(1)));
    }

    public long totalCustomers() {
        return jdbc.queryForObject("""
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE r.code = 'CUSTOMER' AND u.deleted_at IS NULL
                """, Long.class);
    }

    public long newCustomers(LocalDate start, LocalDate end) {
        return jdbc.queryForObject("""
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE r.code = 'CUSTOMER' AND u.deleted_at IS NULL
                  AND u.created_at >= ? AND u.created_at < ?
                """, Long.class, timestamp(start), timestamp(end.plusDays(1)));
    }

    public long repeatCustomers(LocalDate start, LocalDate end) {
        return jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM (
                    SELECT o.user_id
                    FROM orders o
                    JOIN users u ON u.id = o.user_id AND u.deleted_at IS NULL
                    WHERE o.payment_status = 'PAID' AND o.status <> 'CANCELLED'
                      AND o.created_at >= ? AND o.created_at < ?
                    GROUP BY o.user_id
                    HAVING COUNT(*) > 1
                ) repeat_customers
                """, Long.class, timestamp(start), timestamp(end.plusDays(1)));
    }

    public List<AdminReportsDtos.TrendPoint> revenueTrend(LocalDate start, LocalDate end) {
        return trend("""
                SELECT CAST(created_at AS DATE) AS report_date, SUM(total_amount) AS amount, COUNT(*) AS row_count
                FROM orders
                WHERE payment_status = 'PAID' AND status <> 'CANCELLED'
                  AND created_at >= ? AND created_at < ?
                GROUP BY CAST(created_at AS DATE) ORDER BY report_date
                """, start, end);
    }

    public List<AdminReportsDtos.TrendPoint> orderTrend(LocalDate start, LocalDate end) {
        return trend("""
                SELECT CAST(created_at AS DATE) AS report_date, COUNT(*) AS amount, COUNT(*) AS row_count
                FROM orders
                WHERE created_at >= ? AND created_at < ?
                GROUP BY CAST(created_at AS DATE) ORDER BY report_date
                """, start, end);
    }

    public List<AdminReportsDtos.TrendPoint> customerTrend(LocalDate start, LocalDate end) {
        return trend("""
                SELECT CAST(u.created_at AS DATE) AS report_date, COUNT(DISTINCT u.id) AS amount, COUNT(DISTINCT u.id) AS row_count
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE r.code = 'CUSTOMER' AND u.deleted_at IS NULL
                  AND u.created_at >= ? AND u.created_at < ?
                GROUP BY CAST(u.created_at AS DATE) ORDER BY report_date
                """, start, end);
    }

    public List<AdminReportsDtos.ProductSales> bestSelling(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT p.id, oi.product_name_snapshot, SUM(oi.quantity) AS quantity, SUM(oi.line_total) AS revenue
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE o.payment_status = 'PAID' AND o.status <> 'CANCELLED'
                  AND o.created_at >= ? AND o.created_at < ?
                GROUP BY p.id, oi.product_name_snapshot
                ORDER BY quantity DESC, revenue DESC
                LIMIT 10
                """, (rs, row) -> new AdminReportsDtos.ProductSales(
                rs.getString(1), rs.getString(2), rs.getLong(3), decimal(rs.getBigDecimal(4))),
                timestamp(start), timestamp(end.plusDays(1)));
    }

    public List<AdminReportsDtos.CategorySales> categorySales(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT c.id, c.name, SUM(oi.quantity) AS quantity, SUM(oi.line_total) AS revenue
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN product_variants v ON v.id = oi.variant_id
                JOIN product_categories pc ON pc.product_id = v.product_id AND pc.is_primary = TRUE
                JOIN categories c ON c.id = pc.category_id
                WHERE o.payment_status = 'PAID' AND o.status <> 'CANCELLED'
                  AND o.created_at >= ? AND o.created_at < ?
                GROUP BY c.id, c.name
                ORDER BY quantity DESC, revenue DESC
                LIMIT 10
                """, (rs, row) -> new AdminReportsDtos.CategorySales(
                rs.getString(1), rs.getString(2), rs.getLong(3), decimal(rs.getBigDecimal(4))),
                timestamp(start), timestamp(end.plusDays(1)));
    }

    public List<AdminReportsDtos.LowStockProduct> lowStockProducts() {
        return jdbc.query("""
                SELECT p.id, p.name, p.sku, COUNT(v.id) AS low_stock_variants,
                       COALESCE(SUM(GREATEST(v.quantity - v.reserved_quantity, 0)), 0) AS available_units
                FROM products p
                JOIN product_variants v ON v.product_id = p.id AND v.status = 'ACTIVE'
                WHERE p.deleted_at IS NULL AND p.status = 'PUBLISHED'
                  AND v.quantity - v.reserved_quantity BETWEEN 1 AND 5
                GROUP BY p.id, p.name, p.sku
                ORDER BY low_stock_variants DESC, available_units ASC
                LIMIT 10
                """, (rs, row) -> new AdminReportsDtos.LowStockProduct(
                rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4), rs.getLong(5)));
    }

    public Map<String, Object> returnSummary(LocalDate start, LocalDate end) {
        return jdbc.queryForMap("""
                SELECT COUNT(*) AS total,
                       SUM(CASE WHEN status = 'REQUESTED' THEN 1 ELSE 0 END) AS pending,
                       SUM(CASE WHEN status IN ('APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED',
                           'QUALITY_CHECK', 'REPLACEMENT_PROCESSING', 'REPLACED', 'REFUND_PROCESSING', 'REFUNDED')
                           THEN 1 ELSE 0 END) AS approved,
                       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
                FROM return_requests
                WHERE created_at >= ? AND created_at < ?
                """, timestamp(start), timestamp(end.plusDays(1)));
    }

    public BigDecimal pendingRefundAmount(LocalDate start, LocalDate end) {
        return decimal(jdbc.queryForObject("""
                SELECT COALESCE(SUM(amount), 0)
                FROM return_refund_transactions
                WHERE status IN ('CREATED', 'PENDING', 'SUBMITTING', 'PROCESSING')
                  AND created_at >= ? AND created_at < ?
                """, BigDecimal.class, timestamp(start), timestamp(end.plusDays(1))));
    }

    public AdminReportsDtos.Memberships membershipSummary(LocalDate start, LocalDate end) {
        Map<String, Object> totals = jdbc.queryForMap("""
                SELECT SUM(CASE WHEN status = 'ACTIVE' AND starts_at <= CURRENT_TIMESTAMP AND expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS active,
                       SUM(CASE WHEN status = 'EXPIRED' OR expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS expired
                FROM memberships
                WHERE created_at >= ? AND created_at < ?
                """, timestamp(start), timestamp(end.plusDays(1)));
        BigDecimal revenue = decimal(jdbc.queryForObject("""
                SELECT COALESCE(SUM(amount), 0)
                FROM membership_payments
                WHERE status = 'CAPTURED' AND created_at >= ? AND created_at < ?
                """, BigDecimal.class, timestamp(start), timestamp(end.plusDays(1))));
        List<AdminReportsDtos.PlanMembershipCount> plans = jdbc.query("""
                SELECT p.name, COUNT(m.id)
                FROM memberships m
                JOIN membership_plans p ON p.id = m.plan_id
                WHERE m.created_at >= ? AND m.created_at < ?
                GROUP BY p.id, p.name
                ORDER BY COUNT(m.id) DESC, p.name
                """, (rs, row) -> new AdminReportsDtos.PlanMembershipCount(rs.getString(1), rs.getLong(2)),
                timestamp(start), timestamp(end.plusDays(1)));
        return new AdminReportsDtos.Memberships(
                number(totals, "active"),
                number(totals, "expired"),
                revenue,
                plans);
    }

    public long processedRefundCount(LocalDate start, LocalDate end) {
        return jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM return_refund_transactions
                WHERE status = 'PROCESSED' AND processed_at >= ? AND processed_at < ?
                """, Long.class, timestamp(start), timestamp(end.plusDays(1)));
    }

    private List<AdminReportsDtos.TrendPoint> trend(String sql, LocalDate start, LocalDate end) {
        return jdbc.query(sql, (rs, row) -> {
            Date sqlDate = rs.getDate("report_date");
            LocalDate date = sqlDate.toLocalDate();
            return new AdminReportsDtos.TrendPoint(date, decimal(rs.getBigDecimal("amount")), rs.getLong("row_count"));
        }, timestamp(start), timestamp(end.plusDays(1)));
    }

    private static Timestamp timestamp(LocalDate date) {
        return Timestamp.from(date.atStartOfDay(REPORT_ZONE).toInstant());
    }

    private static BigDecimal decimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static long number(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value instanceof Number number ? number.longValue() : 0;
    }
}
