package com.dreamspex.admin;

import static com.dreamspex.admin.AdminReportsDtos.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.dreamspex.common.ApiException;

@Service
public class AdminReportsService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private final AdminReportsRepository reports;

    public AdminReportsService(AdminReportsRepository reports) {
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public Report report(LocalDate requestedStart, LocalDate requestedEnd) {
        LocalDate today = LocalDate.now(REPORT_ZONE);
        LocalDate end = requestedEnd == null ? today : requestedEnd;
        LocalDate start = requestedStart == null ? end.minusDays(29) : requestedStart;
        if (end.isBefore(start)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REPORT_RANGE", "The report end date must not precede the start date.");
        }
        if (start.isBefore(end.minusDays(364))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REPORT_RANGE_TOO_LARGE", "Report date ranges cannot exceed 365 days.");
        }

        BigDecimal paidRevenue = reports.paidRevenue(start, end);
        BigDecimal refundDeductions = reports.processedRefunds(start, end);
        LocalDate weekStart = today.minusDays(6);
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate yearStart = today.withDayOfYear(1);
        Map<String, Object> orderSummary = reports.orderSummary(start, end);
        Map<String, Object> returnSummary = reports.returnSummary(start, end);

        return new Report(
                start,
                end,
                new Revenue(
                        paidRevenue,
                        refundDeductions,
                        paidRevenue.subtract(refundDeductions),
                        decimal(orderSummary, "discounts"),
                        decimal(orderSummary, "gst_collected"),
                        reports.paidRevenue(today, today),
                        reports.paidRevenue(weekStart, today),
                        reports.paidRevenue(today.minusDays(29), today),
                        reports.paidRevenue(monthStart, today),
                        reports.paidRevenue(yearStart, today),
                        reports.revenueTrend(start, end)),
                new Orders(
                        number(orderSummary, "total"),
                        number(orderSummary, "paid"),
                        number(orderSummary, "pending"),
                        number(orderSummary, "cancelled"),
                        number(orderSummary, "delivered"),
                        decimal(orderSummary, "average_order_value"),
                        reports.orderTrend(start, end)),
                new Customers(
                        reports.totalCustomers(),
                        reports.newCustomers(start, end),
                        reports.repeatCustomers(start, end),
                        reports.customerTrend(start, end)),
                new Products(reports.bestSelling(start, end), reports.categorySales(start, end), reports.lowStockProducts()),
                new Returns(
                        number(returnSummary, "total"),
                        number(returnSummary, "approved"),
                        number(returnSummary, "rejected"),
                        number(returnSummary, "pending"),
                        reports.processedRefundCount(start, end),
                        refundDeductions,
                        reports.pendingRefundAmount(start, end)),
                reports.membershipSummary(start, end));
    }

    private static long number(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value instanceof Number number ? number.longValue() : 0;
    }

    private static BigDecimal decimal(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value instanceof BigDecimal amount ? amount : value instanceof Number number
                ? BigDecimal.valueOf(number.doubleValue()) : BigDecimal.ZERO;
    }
}
