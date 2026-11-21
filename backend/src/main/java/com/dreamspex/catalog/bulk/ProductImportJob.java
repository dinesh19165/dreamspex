package com.dreamspex.catalog.bulk;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_import_jobs")
public class ProductImportJob {
    @Id
    @Column(length = 36)
    private String id = UUID.randomUUID().toString();

    @Column(name = "created_by", length = 36, nullable = false)
    private String createdBy;

    @Column(name = "import_mode", length = 16, nullable = false)
    private String importMode;

    @Column(name = "inventory_mode", length = 16, nullable = false)
    private String inventoryMode;

    @Column(length = 16, nullable = false)
    private String status;

    @Column(name = "workbook_name", length = 255, nullable = false)
    private String workbookName;

    @Column(name = "workbook_sha256", length = 64, nullable = false)
    private String workbookSha256;

    @Column(name = "images_sha256", length = 64)
    private String imagesSha256;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "new_products", nullable = false)
    private int newProducts;

    @Column(name = "existing_products", nullable = false)
    private int existingProducts;

    @Column(name = "valid_records", nullable = false)
    private int validRecords;

    @Column(name = "invalid_records", nullable = false)
    private int invalidRecords;

    @Column(name = "missing_images", nullable = false)
    private int missingImages;

    @Column(name = "duplicate_skus", nullable = false)
    private int duplicateSkus;

    @Column(name = "invalid_categories", nullable = false)
    private int invalidCategories;

    @Column(name = "invalid_prices", nullable = false)
    private int invalidPrices;

    @Column(name = "invalid_variants", nullable = false)
    private int invalidVariants;

    @Column(name = "imported_records", nullable = false)
    private int importedRecords;

    @Column(name = "error_report_json", nullable = false, columnDefinition = "LONGTEXT")
    private String errorReportJson = "[]";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public String getId() { return id; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String value) { createdBy = value; }
    public String getImportMode() { return importMode; }
    public void setImportMode(String value) { importMode = value; }
    public String getInventoryMode() { return inventoryMode; }
    public void setInventoryMode(String value) { inventoryMode = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public String getWorkbookName() { return workbookName; }
    public void setWorkbookName(String value) { workbookName = value; }
    public String getWorkbookSha256() { return workbookSha256; }
    public void setWorkbookSha256(String value) { workbookSha256 = value; }
    public String getImagesSha256() { return imagesSha256; }
    public void setImagesSha256(String value) { imagesSha256 = value; }
    public int getTotalRows() { return totalRows; }
    public void setTotalRows(int value) { totalRows = value; }
    public int getNewProducts() { return newProducts; }
    public void setNewProducts(int value) { newProducts = value; }
    public int getExistingProducts() { return existingProducts; }
    public void setExistingProducts(int value) { existingProducts = value; }
    public int getValidRecords() { return validRecords; }
    public void setValidRecords(int value) { validRecords = value; }
    public int getInvalidRecords() { return invalidRecords; }
    public void setInvalidRecords(int value) { invalidRecords = value; }
    public int getMissingImages() { return missingImages; }
    public void setMissingImages(int value) { missingImages = value; }
    public int getDuplicateSkus() { return duplicateSkus; }
    public void setDuplicateSkus(int value) { duplicateSkus = value; }
    public int getInvalidCategories() { return invalidCategories; }
    public void setInvalidCategories(int value) { invalidCategories = value; }
    public int getInvalidPrices() { return invalidPrices; }
    public void setInvalidPrices(int value) { invalidPrices = value; }
    public int getInvalidVariants() { return invalidVariants; }
    public void setInvalidVariants(int value) { invalidVariants = value; }
    public int getImportedRecords() { return importedRecords; }
    public void setImportedRecords(int value) { importedRecords = value; }
    public String getErrorReportJson() { return errorReportJson; }
    public void setErrorReportJson(String value) { errorReportJson = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant value) { completedAt = value; }
}
