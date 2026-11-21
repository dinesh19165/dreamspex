package com.dreamspex.catalog.bulk;

import java.time.Instant;
import java.util.List;

public final class ProductBulkDtos {
    private ProductBulkDtos() {}

    public record RowError(String sheet, int row, String sku, String field, String message) {}

    public record ImportSummary(
            String jobId,
            String mode,
            String inventoryMode,
            String status,
            int totalRows,
            int newProducts,
            int existingProducts,
            int newVariants,
            int updatedVariants,
            int validRecords,
            int invalidRecords,
            int missingImages,
            int duplicateSkus,
            int invalidCategories,
            int invalidPrices,
            int invalidVariants,
            int importedRecords,
            List<RowError> errors) {}

    public record ImportHistoryEntry(
            String jobId,
            String mode,
            String inventoryMode,
            String status,
            String workbookName,
            int totalRows,
            int newProducts,
            int existingProducts,
            int validRecords,
            int invalidRecords,
            int importedRecords,
            Instant createdAt,
            Instant completedAt) {}
}
