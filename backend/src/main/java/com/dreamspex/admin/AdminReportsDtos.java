package com.dreamspex.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class AdminReportsDtos {
    private AdminReportsDtos() {}

    public record Report(
            LocalDate startDate,
            LocalDate endDate,
            Revenue revenue,
            Orders orders,
            Customers customers,
            Products products,
            Returns returns
    ) {}

    public record Revenue(
            BigDecimal paidRevenue,
            BigDecimal refundDeductions,
            BigDecimal netRevenue,
            BigDecimal today,
            BigDecimal last7Days,
            BigDecimal last30Days,
            BigDecimal thisMonth,
            BigDecimal thisYear,
            List<TrendPoint> trend
    ) {}

    public record Orders(
            long total,
            long paid,
            long pending,
            long cancelled,
            long delivered,
            BigDecimal averageOrderValue,
            List<TrendPoint> trend
    ) {}

    public record Customers(long totalRegistered, long newCustomers, long repeatCustomers, List<TrendPoint> trend) {}

    public record Products(
            List<ProductSales> bestSelling,
            List<CategorySales> categorySales,
            List<LowStockProduct> lowStock
    ) {}

    public record Returns(long total, long approved, long rejected, long processedRefunds, BigDecimal refundedAmount) {}

    public record TrendPoint(LocalDate date, BigDecimal value, long count) {}

    public record ProductSales(String productId, String name, long quantity, BigDecimal revenue) {}

    public record CategorySales(String categoryId, String name, long quantity, BigDecimal revenue) {}

    public record LowStockProduct(String productId, String name, String sku, long lowStockVariants, long availableUnits) {}
}
