package com.dreamspex.catalog.bulk;

import com.dreamspex.admin.HomepageImageStorage;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.franchise.FranchiseService;
import com.dreamspex.prescription.PrescriptionStorage;
import com.dreamspex.returns.ReturnableProduct;
import com.dreamspex.returns.ReturnableProductRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import static com.dreamspex.catalog.bulk.ProductBulkDtos.*;

@Service
public class ProductBulkService {
    private static final int MAX_WORKBOOK_BYTES = 15 * 1024 * 1024;
    private static final int MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
    private static final int MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    private static final int MAX_TOTAL_IMAGE_BYTES = 100 * 1024 * 1024;
    private static final int MAX_ARCHIVE_ENTRIES = 1_000;
    private static final int IMPORT_CHUNK_SIZE = 100;
    private static final String IMAGE_PATH = "/api/v1/cms/images/";
    private static final String PRODUCT_SHEET = "Products";
    private static final String VARIANT_SHEET = "Variants & Inventory";

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CategoryRepository categories;
    private final ReturnableProductRepository returnableProducts;
    private final ProductImportJobRepository jobs;
    private final HomepageImageStorage imageStorage;
    private final FranchiseService franchises;
    private final AuditLogService audit;
    private final ObjectMapper objectMapper;

    public ProductBulkService(ProductRepository products, ProductVariantRepository variants,
                              CategoryRepository categories, ReturnableProductRepository returnableProducts,
                              ProductImportJobRepository jobs, HomepageImageStorage imageStorage,
                              FranchiseService franchises, AuditLogService audit, ObjectMapper objectMapper) {
        this.products = products;
        this.variants = variants;
        this.categories = categories;
        this.returnableProducts = returnableProducts;
        this.jobs = jobs;
        this.imageStorage = imageStorage;
        this.franchises = franchises;
        this.audit = audit;
        this.objectMapper = objectMapper;
    }

    public byte[] template() {
        try {
            return ProductBulkWorkbook.template();
        } catch (IOException exception) {
            throw new IllegalStateException("Product import template could not be generated.", exception);
        }
    }

    @Transactional(readOnly = true)
    public ExportFile export(List<String> productIds, String categoryId, String status, boolean archive) {
        String requestedStatus = blank(status);
        if (requestedStatus != null) {
            requestedStatus = requestedStatus.toUpperCase(Locale.ROOT);
            if (!Set.of("DRAFT", "PUBLISHED", "INACTIVE").contains(requestedStatus)) {
                throw invalid("Status must be DRAFT, PUBLISHED or INACTIVE.");
            }
        }
        final String normalizedStatus = requestedStatus;
        List<Product> selected = productIds == null || productIds.isEmpty()
                ? products.findAll()
                : products.findAllById(new LinkedHashSet<>(productIds));
        if (productIds != null && !productIds.isEmpty() && selected.size() != new LinkedHashSet<>(productIds).size()) {
            throw invalid("One or more selected products could not be found.");
        }
        selected = selected.stream()
                .filter(product -> product.getDeletedAt() == null)
                .filter(product -> normalizedStatus == null || normalizedStatus.equalsIgnoreCase(product.getStatus()))
                .filter(product -> categoryId == null || categoryId.isBlank()
                        || product.getCategories().stream().anyMatch(category -> category.getId().equals(categoryId)))
                .sorted(Comparator.comparing(Product::getSku, String.CASE_INSENSITIVE_ORDER))
                .toList();

        try {
            ExportData data = exportData(selected, archive);
            byte[] workbook = ProductBulkWorkbook.export(data.products(), data.variants());
            if (!archive) {
                return new ExportFile("DreamSpex_Products.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbook);
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(output)) {
                addZipEntry(zip, "products.xlsx", workbook);
                for (Map.Entry<String, byte[]> image : data.images().entrySet()) {
                    addZipEntry(zip, image.getKey(), image.getValue());
                }
            }
            return new ExportFile("DreamSpex_Products.zip", "application/zip", output.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("Product export could not be generated.", exception);
        }
    }

    @Transactional
    public ImportSummary preview(User actor, MultipartFile workbookFile, MultipartFile imagesZip,
                                 String requestedMode, String requestedInventoryMode) {
        String mode = normalizeOption(requestedMode, Set.of("CREATE", "UPDATE"), "Import mode must be CREATE or UPDATE.");
        String inventoryMode = normalizeOption(requestedInventoryMode, Set.of("SET", "ADD"),
                "Inventory mode must be SET or ADD.");
        UploadedImport uploaded = readUploadedImport(workbookFile, imagesZip);
        ImportPlan plan = validate(uploaded.data(), uploaded.images(), mode, inventoryMode);

        ProductImportJob job = new ProductImportJob();
        job.setCreatedBy(actor.getId());
        job.setImportMode(mode);
        job.setInventoryMode(inventoryMode);
        job.setStatus("PREVIEWED");
        job.setWorkbookName(safeFilename(workbookFile.getOriginalFilename()));
        job.setWorkbookSha256(sha256(uploaded.workbookBytes()));
        job.setImagesSha256(uploaded.archiveBytes() == null ? null : sha256(uploaded.archiveBytes()));
        writeSummary(job, plan, 0);
        try {
            job.setErrorReportJson(objectMapper.writeValueAsString(plan.errors()));
        } catch (IOException exception) {
            throw new IllegalStateException("Import validation report could not be saved.", exception);
        }
        jobs.save(job);
        audit.record(actor, "PRODUCT_IMPORT_PREVIEWED", "PRODUCT_IMPORT", job.getId());
        return summary(job, plan.errors(), plan);
    }

    @Transactional
    public ImportSummary importProducts(User actor, String jobId, MultipartFile workbookFile,
                                        MultipartFile imagesZip) {
        ProductImportJob job = jobs.findWithLockById(jobId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "IMPORT_NOT_FOUND", "Import preview was not found."));
        if (!job.getCreatedBy().equals(actor.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "IMPORT_NOT_FOUND", "Import preview was not found.");
        }
        if (!"PREVIEWED".equals(job.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "IMPORT_ALREADY_COMPLETED", "This import preview has already been used.");
        }
        UploadedImport uploaded = readUploadedImport(workbookFile, imagesZip);
        if (!job.getWorkbookSha256().equals(sha256(uploaded.workbookBytes()))
                || !optionalEquals(job.getImagesSha256(), uploaded.archiveBytes() == null
                        ? null : sha256(uploaded.archiveBytes()))) {
            throw new ApiException(HttpStatus.CONFLICT, "IMPORT_FILES_CHANGED",
                    "The workbook or image ZIP differs from the files that were previewed. Preview the files again.");
        }

        ImportPlan plan = validate(uploaded.data(), uploaded.images(), job.getImportMode(), job.getInventoryMode());
        Map<String, StoredImage> storedImages = new HashMap<>();
        CategoryIndex categoryIndex = loadCategoryIndex();
        List<String> existingProductIds = plan.products().stream().map(ProductRow::existing)
                .filter(java.util.Objects::nonNull).map(Product::getId).distinct().toList();
        Map<String, ReturnableProduct> returnabilityByProductId = returnableProducts
                .findAllByProductIdIn(existingProductIds).stream()
                .collect(java.util.stream.Collectors.toMap(ReturnableProduct::getProductId, value -> value));
        int imported = 0;
        int processed = 0;
        for (ProductRow row : plan.products()) {
            if (!row.errors().isEmpty()) continue;
            Product product = row.existing() == null ? new Product() : row.existing();
            updateProduct(product, row, plan.images(), storedImages, plan.mode(), categoryIndex);
            Product saved = products.save(product);
            applyVariants(saved, plan.variantsByProduct().getOrDefault(key(row.sku()), List.of()),
                    plan.inventoryMode());
            updateReturnability(saved, row, actor, plan.mode(), returnabilityByProductId);
            if ("PUBLISHED".equals(saved.getStatus())) franchises.syncPublishedProductInventory(saved);
            imported += 1 + plan.variantsByProduct().getOrDefault(key(row.sku()), List.of()).stream()
                    .filter(variant -> variant.errors().isEmpty()).count();
            processed++;
            if (processed % IMPORT_CHUNK_SIZE == 0) {
                products.flush();
                variants.flush();
            }
        }
        products.flush();
        variants.flush();

        job.setStatus("COMPLETED");
        job.setCompletedAt(Instant.now());
        writeSummary(job, plan, imported);
        try {
            job.setErrorReportJson(objectMapper.writeValueAsString(plan.errors()));
        } catch (IOException exception) {
            throw new IllegalStateException("Import validation report could not be saved.", exception);
        }
        audit.record(actor, "PRODUCT_IMPORT_COMPLETED", "PRODUCT_IMPORT", job.getId());
        return summary(job, plan.errors(), plan);
    }

    @Transactional(readOnly = true)
    public List<ImportHistoryEntry> history() {
        return jobs.findTop50ByOrderByCreatedAtDesc().stream().map(this::historyEntry).toList();
    }

    @Transactional(readOnly = true)
    public byte[] errorReport(String jobId) {
        ProductImportJob job = jobs.findById(jobId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "IMPORT_NOT_FOUND", "Import history was not found."));
        try {
            List<RowError> errors = objectMapper.readValue(job.getErrorReportJson(), new TypeReference<>() {});
            return ProductBulkWorkbook.errorReport(errors);
        } catch (IOException exception) {
            throw new IllegalStateException("Import error report could not be generated.", exception);
        }
    }

    private UploadedImport readUploadedImport(MultipartFile workbookFile, MultipartFile imagesZip) {
        if (workbookFile == null || workbookFile.isEmpty() || workbookFile.getSize() > MAX_WORKBOOK_BYTES
                || workbookFile.getOriginalFilename() == null
                || !workbookFile.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORKBOOK",
                    "Upload a non-empty .xlsx workbook no larger than 15 MB.");
        }
        byte[] workbookBytes;
        try {
            workbookBytes = workbookFile.getBytes();
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORKBOOK", "The workbook could not be read.", exception);
        }
        if (workbookBytes.length < 4 || workbookBytes[0] != 'P' || workbookBytes[1] != 'K') {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORKBOOK", "The uploaded file is not a valid .xlsx workbook.");
        }

        byte[] archiveBytes = null;
        Map<String, ImageAsset> images = Map.of();
        if (imagesZip != null && !imagesZip.isEmpty()) {
            if (imagesZip.getSize() > MAX_ARCHIVE_BYTES || imagesZip.getOriginalFilename() == null
                    || !imagesZip.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".zip")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_ARCHIVE",
                        "Upload an image ZIP no larger than 50 MB.");
            }
            try {
                archiveBytes = imagesZip.getBytes();
                images = readImageArchive(archiveBytes);
            } catch (IOException exception) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_ARCHIVE",
                        exception.getMessage() == null ? "The image ZIP could not be read." : exception.getMessage(), exception);
            }
        }

        try {
            return new UploadedImport(workbookBytes, archiveBytes, images, ProductBulkWorkbook.parse(workbookBytes));
        } catch (IOException | org.apache.poi.EncryptedDocumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORKBOOK",
                    exception.getMessage() == null ? "The workbook could not be read." : exception.getMessage(), exception);
        }
    }

    private Map<String, ImageAsset> readImageArchive(byte[] bytes) throws IOException {
        if (bytes.length < 4 || bytes[0] != 'P' || bytes[1] != 'K') {
            throw new IOException("The uploaded image file is not a valid ZIP archive.");
        }
        Map<String, ImageAsset> images = new LinkedHashMap<>();
        Set<String> basenames = new HashSet<>();
        long totalBytes = 0;
        int entries = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > MAX_ARCHIVE_ENTRIES) throw new IOException("The image ZIP contains too many files.");
                String name = entry.getName();
                validateArchivePath(name);
                if (entry.isDirectory()) continue;
                String filename = name.substring(name.lastIndexOf('/') + 1);
                if ("products.xlsx".equalsIgnoreCase(filename)) continue;
                String extension = extension(filename);
                if (!Set.of("jpg", "jpeg", "png", "webp").contains(extension)) {
                    throw new IOException("The image ZIP may contain only JPG, JPEG, PNG, WebP images and an optional products.xlsx file.");
                }
                if (!basenames.add(filename)) {
                    throw new IOException("The image ZIP contains duplicate image filenames.");
                }
                byte[] content = zip.readNBytes(MAX_IMAGE_BYTES + 1);
                if (content.length > MAX_IMAGE_BYTES) throw new IOException("Images must be 10 MB or smaller.");
                totalBytes += content.length;
                if (totalBytes > MAX_TOTAL_IMAGE_BYTES) throw new IOException("The uncompressed image ZIP exceeds 100 MB.");
                String contentType = validateImage(filename, content);
                images.put(filename, new ImageAsset(filename, content, contentType));
            }
        }
        return images;
    }

    private void validateArchivePath(String name) throws IOException {
        if (name == null || name.isBlank() || name.startsWith("/") || name.startsWith("\\")
                || name.contains("\\") || name.matches("^[A-Za-z]:.*")) {
            throw new IOException("The image ZIP contains an unsafe file path.");
        }
        for (String segment : name.split("/")) {
            if (segment.isBlank() || ".".equals(segment) || "..".equals(segment) || segment.indexOf(':') >= 0) {
                throw new IOException("The image ZIP contains an unsafe file path.");
            }
        }
    }

    private String validateImage(String filename, byte[] bytes) throws IOException {
        if (bytes.length < 12) throw new IOException("An image file is empty or invalid.");
        String extension = extension(filename);
        boolean jpeg = bytes.length >= 3 && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
        boolean png = (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                && bytes[4] == 0x0d && bytes[5] == 0x0a && (bytes[6] & 0xff) == 0x1a && bytes[7] == 0x0a;
        boolean webp = bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
        if (Set.of("jpg", "jpeg").contains(extension) && jpeg) return "image/jpeg";
        if ("png".equals(extension) && png) return "image/png";
        if ("webp".equals(extension) && webp) return "image/webp";
        throw new IOException("Image contents do not match the JPG, JPEG, PNG or WebP filename extension.");
    }

    private ImportPlan validate(ProductBulkWorkbook.WorkbookData data, Map<String, ImageAsset> images,
                                String mode, String inventoryMode) {
        List<ProductRow> productRows = data.products().stream().map(row -> productRow(row, mode)).toList();
        Map<String, List<ProductRow>> productRowsBySku = new HashMap<>();
        for (ProductRow row : productRows) {
            if (!row.sku().isBlank()) productRowsBySku.computeIfAbsent(key(row.sku()), ignored -> new ArrayList<>()).add(row);
        }
        productRowsBySku.values().stream().filter(rows -> rows.size() > 1).forEach(rows ->
                rows.forEach(row -> row.error("SKU", "Duplicate product SKU in this workbook.")));

        List<String> productSkus = productRows.stream().map(ProductRow::sku).filter(value -> !value.isBlank()).distinct().toList();
        Map<String, Product> existingProducts = new HashMap<>();
        if (!productSkus.isEmpty()) {
            products.findAllBySkuIn(productSkus).forEach(product -> existingProducts.put(key(product.getSku()), product));
        }
        Set<String> slugs = new HashSet<>();
        for (ProductRow row : productRows) {
            row.existing(existingProducts.get(key(row.sku())));
            row.normalizedSlug(row.slug() == null
                    ? "CREATE".equals(mode) ? slug(row.name() + "-" + row.sku())
                    : row.existing() == null ? null : row.existing().getSlug()
                    : slug(row.slug()));
        }
        Set<String> requestedSlugs = productRows.stream().map(ProductRow::normalizedSlug)
                .filter(value -> value != null && !value.isBlank()).collect(java.util.stream.Collectors.toSet());
        Map<String, Product> productsBySlug = new HashMap<>();
        if (!requestedSlugs.isEmpty()) {
            products.findAllBySlugIn(requestedSlugs)
                    .forEach(product -> productsBySlug.put(key(product.getSlug()), product));
        }
        CategoryIndex categoryIndex = loadCategoryIndex();
        for (ProductRow row : productRows) {
            validateProductRow(row, mode, images, slugs, productsBySlug, categoryIndex);
        }

        List<ProductVariant> existingVariants = List.of();
        List<String> variantSkus = data.variants().stream().map(row -> row.get("Variant SKU"))
                .map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
        if (!variantSkus.isEmpty()) existingVariants = variants.findAllBySkuIn(variantSkus);
        Map<String, ProductVariant> existingVariantsBySku = new HashMap<>();
        existingVariants.forEach(variant -> existingVariantsBySku.put(key(variant.getSku()), variant));

        Map<String, List<VariantRow>> variantsByProduct = new LinkedHashMap<>();
        Map<String, List<VariantRow>> variantsBySku = new HashMap<>();
        for (ProductBulkWorkbook.DataRow raw : data.variants()) {
            VariantRow row = variantRow(raw, productRowsBySku, existingProducts, existingVariantsBySku,
                    mode, inventoryMode);
            variantsByProduct.computeIfAbsent(key(row.productSku()), ignored -> new ArrayList<>()).add(row);
            if (!row.sku().isBlank()) {
                variantsBySku.computeIfAbsent(key(row.sku()), ignored -> new ArrayList<>()).add(row);
            }
        }
        variantsBySku.values().stream().filter(rows -> rows.size() > 1).forEach(rows ->
                rows.forEach(row -> row.error("Variant SKU", "Duplicate variant SKU in this workbook.")));

        List<RowError> errors = new ArrayList<>();
        productRows.forEach(row -> errors.addAll(row.errors()));
        variantsByProduct.values().forEach(rows -> rows.forEach(row -> errors.addAll(row.errors())));
        errors.sort(Comparator.comparing(RowError::sheet).thenComparingInt(RowError::row)
                .thenComparing(RowError::field));

        int invalidVariantRows = (int) variantsByProduct.values().stream().flatMap(List::stream)
                .filter(row -> !row.errors().isEmpty()).count();
        int invalidProducts = (int) productRows.stream().filter(row -> !row.errors().isEmpty()).count();
        int missingImages = countErrors(errors, "missing");
        int duplicateSkus = (int) errors.stream()
                .filter(error -> Set.of("SKU", "Variant SKU").contains(error.field()))
                .filter(error -> error.message().toLowerCase(Locale.ROOT).contains("duplicate")
                        || error.message().toLowerCase(Locale.ROOT).contains("already exists"))
                .count();
        int invalidCategories = (int) errors.stream().filter(error -> "Category Names".equals(error.field())).count();
        int invalidPrices = (int) errors.stream().filter(error ->
                Set.of("Base Price", "Compare-at Price", "GST Rate", "Price Adjustment").contains(error.field())).count();
        int invalidVariants = invalidVariantRows;
        int newProducts = "CREATE".equals(mode)
                ? (int) productRows.stream().filter(row -> row.existing() == null && row.errors().isEmpty()).count() : 0;
        int existingCount = "UPDATE".equals(mode) ? (int) productRows.stream()
                .filter(row -> row.existing() != null && row.errors().isEmpty())
                .count() : 0;
        List<VariantRow> validVariantRows = variantsByProduct.values().stream().flatMap(List::stream)
                .filter(row -> row.errors().isEmpty()).toList();
        int newVariants = (int) validVariantRows.stream().filter(row -> row.existing() == null).count();
        int updatedVariants = (int) validVariantRows.stream().filter(row -> row.existing() != null).count();
        int totalRows = data.products().size() + data.variants().size();
        int invalidRecords = invalidProducts + invalidVariantRows;
        return new ImportPlan(mode, inventoryMode, productRows, variantsByProduct, images, errors,
                totalRows, newProducts, existingCount, newVariants, updatedVariants, totalRows - invalidRecords,
                invalidRecords, missingImages, duplicateSkus, invalidCategories,
                invalidPrices, invalidVariants);
    }

    private ProductRow productRow(ProductBulkWorkbook.DataRow raw, String mode) {
        ProductRow row = new ProductRow(raw);
        row.sku(raw.get("SKU").trim());
        row.name(blank(raw.get("Product Name")));
        row.slug(blank(raw.get("Slug")));
        row.brand(blank(raw.get("Brand")));
        row.description(blank(raw.get("Description")));
        row.material(blank(raw.get("Material")));
        row.gender(blank(raw.get("Gender")));
        row.frameShape(blank(raw.get("Frame Shape")));
        row.frameType(blank(raw.get("Frame Type")));
        row.badge(blank(raw.get("Badge")));
        row.status(blank(raw.get("Status")));
        row.hsnCode(blank(raw.get("HSN Code")));
        row.gstEnabled(parseYesNo(row, "GST Applicable", raw.get("GST Applicable")));
        row.useGlobalGst(parseYesNo(row, "Use Global GST Rate", raw.get("Use Global GST Rate")));
        row.nonReturnable(parseYesNo(row, "Non-returnable", raw.get("Non-returnable")));
        row.categoryNames(parseNames(raw.get("Category Names"), "\\|"));
        row.mainImage(blank(raw.get("Product Main Image")));
        row.galleryImages(parseNames(raw.get("Product Gallery Images"), ";"));
        row.tryOnImage(blank(raw.get("Virtual Try-On Image")));
        row.basePrice(parseAmount(row, "Base Price", raw.get("Base Price"), "CREATE".equals(mode)));
        row.compareAtPrice(parseAmount(row, "Compare-at Price", raw.get("Compare-at Price"), false));
        row.gstRate(parseAmount(row, "GST Rate", raw.get("GST Rate"), false));
        return row;
    }

    private void validateProductRow(ProductRow row, String mode, Map<String, ImageAsset> images,
                                    Set<String> seenSlugs, Map<String, Product> productsBySlug,
                                    CategoryIndex categoryIndex) {
        boolean creating = "CREATE".equals(mode);
        if (row.sku().isBlank() || row.sku().length() > 80 || !row.sku().matches("[A-Za-z0-9][A-Za-z0-9._-]{0,79}")) {
            row.error("SKU", "SKU is required and must contain only letters, numbers, dot, underscore or hyphen (up to 80 characters).");
        }
        if (row.existing() != null && row.existing().getDeletedAt() != null) {
            row.error("SKU", "This SKU belongs to a deleted product and cannot be imported.");
        }
        if (creating && row.existing() != null) row.error("SKU", "This SKU already exists; CREATE mode does not update products.");
        if (!creating && row.existing() == null && !row.sku().isBlank()) {
            row.error("SKU", "This SKU does not exist; UPDATE mode only updates existing products.");
        }
        validateLength(row, "Product Name", row.name(), 180, creating);
        validateLength(row, "Brand", row.brand(), 120, creating);
        if (row.description() == null) {
            if (creating) row.error("Description", "Description is required for a new product.");
        } else if (row.description().getBytes(StandardCharsets.UTF_8).length > 65_535) {
            row.error("Description", "Description exceeds the database storage limit.");
        }
        validateLength(row, "Material", row.material(), 80, false);
        validateLength(row, "Gender", row.gender(), 40, false);
        validateLength(row, "Frame Shape", row.frameShape(), 80, false);
        validateLength(row, "Frame Type", row.frameType(), 80, false);
        validateLength(row, "Badge", row.badge(), 60, false);

        if (row.basePrice() == null && creating) row.error("Base Price", "Base Price is required for a new product.");
        if (row.basePrice() != null && invalidAmount(row.basePrice())) row.error("Base Price", "Price must be between 0 and 9999999999.99 with at most two decimal places.");
        if (row.compareAtPrice() != null && invalidAmount(row.compareAtPrice())) row.error("Compare-at Price", "Price must be between 0 and 9999999999.99 with at most two decimal places.");
        if (row.gstRate() != null && (row.gstRate().compareTo(BigDecimal.ZERO) < 0
                || row.gstRate().compareTo(new BigDecimal("100")) > 0
                || row.gstRate().scale() > 2)) {
            row.error("GST Rate", "GST Rate must be between 0 and 100 with at most two decimal places.");
        }
        if (row.hsnCode() != null && !row.hsnCode().matches("[0-9]{4}|[0-9]{6}|[0-9]{8}")) {
            row.error("HSN Code", "HSN Code must contain 4, 6 or 8 digits.");
        }
        if (row.status() != null && !Set.of("DRAFT", "PUBLISHED", "INACTIVE")
                .contains(row.status().toUpperCase(Locale.ROOT))) {
            row.error("Status", "Status must be DRAFT, PUBLISHED or INACTIVE.");
        }
        if (Boolean.FALSE.equals(row.useGlobalGst()) && row.gstRate() == null
                && (creating || row.existing() == null || row.existing().getGstRate() == null)) {
            row.error("GST Rate", "Provide GST Rate when Use Global GST Rate is NO.");
        }

        String normalizedSlug = row.normalizedSlug();
        if (creating && (normalizedSlug == null || normalizedSlug.isBlank())) {
            row.error("Slug", "A product name and SKU are required to generate a slug.");
        }
        if (normalizedSlug != null) {
            if (normalizedSlug.length() > 220) row.error("Slug", "Slug must be 220 characters or fewer.");
            if (!seenSlugs.add(key(normalizedSlug))) row.error("Slug", "Duplicate product slug in this workbook.");
            Product slugOwner = productsBySlug.get(key(normalizedSlug));
            if (slugOwner != null && (row.existing() == null
                    || !slugOwner.getId().equals(row.existing().getId()))) {
                row.error("Slug", "This slug is already used by another product.");
            }
        }

        if (row.hsnCode() != null && row.hsnCode().length() > 16) row.error("HSN Code", "HSN Code is too long.");
        validateCategories(row, creating, categoryIndex);
        validateImageReference(row, "Product Main Image", row.mainImage(), images, false);
        row.galleryImages().forEach(name -> validateImageReference(row, "Product Gallery Images", name, images, false));
        validateImageReference(row, "Virtual Try-On Image", row.tryOnImage(), images, true);
        if (creating && row.mainImage() == null && row.galleryImages().isEmpty()) {
            row.error("Product Main Image", "A new product requires a main or gallery catalogue image.");
        }
    }

    private void validateCategories(ProductRow row, boolean creating, CategoryIndex categoryIndex) {
        if (row.categoryNames().isEmpty()) return;
        for (String name : row.categoryNames()) {
            List<Category> matches = categoryIndex.byName().getOrDefault(key(name), List.of());
            if (matches.size() == 1 && "ACTIVE".equals(matches.get(0).getStatus())) continue;
            if (!creating || !matches.isEmpty() || name.length() > 120 || slug(name).isBlank()
                    || categoryIndex.slugs().contains(key(slug(name)))) {
                row.error("Category Names", "Category \"" + safeText(name, 120) + "\" is not an available catalogue category.");
            }
        }
    }

    private CategoryIndex loadCategoryIndex() {
        Map<String, List<Category>> byName = new HashMap<>();
        Set<String> slugs = new HashSet<>();
        for (Category category : categories.findAll()) {
            if (category.getSlug() != null) slugs.add(key(category.getSlug()));
            if ("CATALOG".equals(category.getCategoryType()) && category.getDeletedAt() == null) {
                byName.computeIfAbsent(key(category.getName()), ignored -> new ArrayList<>()).add(category);
            }
        }
        return new CategoryIndex(byName, slugs);
    }

    private void validateImageReference(ProductRow row, String field, String name,
                                         Map<String, ImageAsset> images, boolean tryOn) {
        if (name == null) return;
        if (name.contains("/") || name.contains("\\") || name.equals(".") || name.equals("..")) {
            row.error(field, "Enter an image filename, not a path.");
            return;
        }
        if (tryOn && !Set.of("png", "webp").contains(extension(name))) {
            row.error(field, "Virtual Try-On images must be PNG or WebP.");
            return;
        }
        if (!images.containsKey(name)) row.error(field, "Image file \"" + safeText(name, 120) + "\" is missing from the image ZIP.");
    }

    private VariantRow variantRow(ProductBulkWorkbook.DataRow raw, Map<String, List<ProductRow>> productRowsBySku,
                                  Map<String, Product> existingProducts,
                                  Map<String, ProductVariant> existingVariantsBySku,
                                  String mode, String inventoryMode) {
        VariantRow row = new VariantRow(raw);
        row.productSku(raw.get("Product SKU").trim());
        row.sku(raw.get("Variant SKU").trim());
        row.color(blank(raw.get("Color")));
        row.size(blank(raw.get("Size")));
        row.lensType(blank(raw.get("Lens Type")));
        row.adjustment(parseAmount(row, "Price Adjustment", raw.get("Price Adjustment"), false));
        String inventoryOperation = blank(raw.get("Inventory Operation"));
        row.inventoryOperation(inventoryOperation == null ? null : inventoryOperation.toUpperCase(Locale.ROOT));
        row.quantity(parseInteger(row, "Quantity", raw.get("Quantity"), false));
        row.reservedQuantity(parseInteger(row, "Reserved Quantity", raw.get("Reserved Quantity"), false));
        if (row.inventoryOperation() != null && !Set.of("SET", "ADD").contains(row.inventoryOperation())) {
            row.error("Inventory Operation", "Inventory Operation must be SET or ADD.");
        }
        if (row.productSku().isBlank() || !productRowsBySku.containsKey(key(row.productSku()))) {
            row.error("Product SKU", "Product SKU must match a row in the Products sheet.");
        }
        if (row.sku().isBlank() || row.sku().length() > 80
                || !row.sku().matches("[A-Za-z0-9][A-Za-z0-9._-]{0,79}")) {
            row.error("Variant SKU", "Variant SKU is required and must contain only letters, numbers, dot, underscore or hyphen (up to 80 characters).");
        }
        for (String field : List.of("Color", "Size", "Lens Type")) {
            String value = switch (field) {
                case "Color" -> row.color();
                case "Size" -> row.size();
                default -> row.lensType();
            };
            int limit = "Size".equals(field) ? 32 : 80;
            validateVariantLength(row, field, value, limit);
        }
        if (row.adjustment() != null && invalidAmount(row.adjustment())) {
            row.error("Price Adjustment", "Price Adjustment must be non-negative with at most two decimal places.");
        }
        if (row.quantity() != null && row.quantity() < 0) row.error("Quantity", "Quantity cannot be negative.");
        if (row.reservedQuantity() != null && row.reservedQuantity() < 0) row.error("Reserved Quantity", "Reserved Quantity cannot be negative.");

        ProductVariant existingVariant = existingVariantsBySku.get(key(row.sku()));
        List<ProductRow> parentRows = productRowsBySku.getOrDefault(key(row.productSku()), List.of());
        Product parent = parentRows.isEmpty() ? existingProducts.get(key(row.productSku()))
                : parentRows.get(0).existing();
        if (parentRows.stream().anyMatch(productRow -> !productRow.errors().isEmpty())) {
            row.error("Product SKU", "The matching product row has validation errors; this variant will not be imported.");
        }
        if (parentRows.size() > 1) {
            row.error("Product SKU", "The Product SKU is duplicated in the Products sheet.");
        }
        if (existingVariant != null) {
            if ("CREATE".equals(mode)) {
                row.error("Variant SKU", "This variant SKU already exists; CREATE mode cannot update variants.");
            } else if (parent == null || !existingVariant.getProduct().getId().equals(parent.getId())) {
                row.error("Variant SKU", "This variant SKU belongs to a different product.");
            }
        }
        row.existing(existingVariant);
        String rowInventoryMode = row.inventoryOperation() == null ? inventoryMode : row.inventoryOperation();
        if (existingVariant == null && "UPDATE".equals(mode) && parent == null) {
            row.error("Product SKU", "Variants can only be added to an existing product in UPDATE mode.");
        }
        if (row.quantity() != null && existingVariant != null && "SET".equals(rowInventoryMode)
                && row.quantity() < existingVariant.getReservedQuantity()) {
            row.error("Quantity", "Quantity cannot be set below the current reserved quantity.");
        }
        if (row.quantity() != null && existingVariant != null && "ADD".equals(rowInventoryMode)
                && (long) existingVariant.getQuantity() + row.quantity() > Integer.MAX_VALUE) {
            row.error("Quantity", "The resulting inventory quantity is too large.");
        }
        if (existingVariant == null && row.reservedQuantity() != null
                && row.reservedQuantity() > (row.quantity() == null ? 0 : row.quantity())) {
            row.error("Reserved Quantity", "Reserved Quantity cannot exceed Quantity for a new variant.");
        }
        if (existingVariant != null && row.reservedQuantity() != null
                && row.reservedQuantity() != existingVariant.getReservedQuantity()) {
            row.error("Reserved Quantity",
                    "Reserved Quantity is system-managed for existing variants; leave it blank or keep its current value.");
        }
        return row;
    }

    private void updateProduct(Product product, ProductRow row, Map<String, ImageAsset> imageAssets,
                               Map<String, StoredImage> storedImages, String mode,
                               CategoryIndex categoryIndex) {
        boolean creating = "CREATE".equals(mode);
        if (creating || row.name() != null) product.setName(row.name());
        if (creating || row.slug() != null) product.setSlug(row.normalizedSlug());
        if (creating || row.brand() != null) product.setBrand(row.brand());
        if (creating || row.description() != null) product.setDescription(row.description());
        if (creating || row.basePrice() != null) product.setBasePrice(row.basePrice());
        if (creating || row.compareAtPrice() != null) product.setCompareAtPrice(row.compareAtPrice());
        if (creating || row.material() != null) product.setMaterial(row.material());
        if (creating || row.gender() != null) product.setGender(row.gender());
        if (creating || row.frameShape() != null) product.setFrameShape(row.frameShape());
        if (creating || row.frameType() != null) product.setFrameType(row.frameType());
        if (creating || row.badge() != null) product.setBadge(row.badge());
        if (creating || row.status() != null) product.setStatus(row.status() == null
                ? "DRAFT" : row.status().toUpperCase(Locale.ROOT));
        if (creating || row.hsnCode() != null) product.setHsnCode(row.hsnCode());
        if (creating || row.gstEnabled() != null) product.setGstEnabled(row.gstEnabled() == null || row.gstEnabled());
        if (creating || row.useGlobalGst() != null) {
            product.setGstRate(Boolean.TRUE.equals(row.useGlobalGst())
                    ? null : row.gstRate() == null ? product.getGstRate() : row.gstRate());
        }
        if (!row.categoryNames().isEmpty()) {
            product.getCategories().clear();
            for (String name : row.categoryNames()) {
                product.getCategories().add(resolveCategory(name, creating, categoryIndex));
            }
        }
        appendImages(product, row, imageAssets, storedImages);
        if (row.tryOnImage() != null) {
            product.setTryOnImageUrl(storedImage(row.tryOnImage(), imageAssets, storedImages).url());
        }
        if (creating) product.setSku(row.sku());
    }

    private void appendImages(Product product, ProductRow row, Map<String, ImageAsset> imageAssets,
                              Map<String, StoredImage> storedImages) {
        if (row.mainImage() == null && row.galleryImages().isEmpty()) return;
        String mainName = row.mainImage();
        List<String> galleryNames = new ArrayList<>(row.galleryImages());
        if (mainName == null && product.getImages().isEmpty() && !galleryNames.isEmpty()) {
            mainName = galleryNames.remove(0);
        }
        if (mainName != null) {
            StoredImage main = storedImage(mainName, imageAssets, storedImages);
            ProductImage matched = product.getImages().stream()
                    .filter(image -> main.storageKey().equals(image.getStorageKey())).findFirst().orElse(null);
            for (ProductImage image : product.getImages()) image.setPrimaryImage(image == matched);
            if (matched == null) {
                ProductImage image = productImage(product, main, true, 0);
                product.getImages().add(image);
            }
        }
        for (String name : galleryNames) {
            StoredImage gallery = storedImage(name, imageAssets, storedImages);
            boolean alreadyAssociated = product.getImages().stream()
                    .anyMatch(image -> gallery.storageKey().equals(image.getStorageKey()));
            if (!alreadyAssociated) {
                product.getImages().add(productImage(product, gallery, false,
                        product.getImages().stream().mapToInt(ProductImage::getSortOrder).max().orElse(-1) + 1));
            }
        }
        if (product.getImages().stream().noneMatch(ProductImage::isPrimaryImage) && !product.getImages().isEmpty()) {
            product.getImages().get(0).setPrimaryImage(true);
        }
        List<ProductImage> sorted = product.getImages().stream()
                .sorted(Comparator.comparing(ProductImage::isPrimaryImage).reversed()
                        .thenComparingInt(ProductImage::getSortOrder)).toList();
        for (int i = 0; i < sorted.size(); i++) sorted.get(i).setSortOrder(i);
    }

    private ProductImage productImage(Product product, StoredImage stored, boolean primary, int order) {
        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setImageUrl(stored.url());
        image.setStorageKey(stored.storageKey());
        image.setAltText(product.getName());
        image.setPrimaryImage(primary);
        image.setSortOrder(order);
        return image;
    }

    private void applyVariants(Product product, List<VariantRow> rows, String inventoryMode) {
        Map<String, ProductVariant> existingBySku = new HashMap<>();
        product.getVariants().forEach(variant -> existingBySku.put(key(variant.getSku()), variant));
        for (VariantRow row : rows) {
            if (!row.errors().isEmpty()) continue;
            ProductVariant variant = existingBySku.get(key(row.sku()));
            if (variant == null) {
                variant = new ProductVariant();
                variant.setProduct(product);
                variant.setSku(row.sku());
                variant.setStatus("ACTIVE");
                variant.setAdditionalPrice(BigDecimal.ZERO);
                variant.setQuantity(0);
                variant.setReservedQuantity(0);
                product.getVariants().add(variant);
                existingBySku.put(key(row.sku()), variant);
            }
            if (row.color() != null) variant.setColor(row.color());
            if (row.size() != null) variant.setSize(row.size());
            if (row.lensType() != null) variant.setLensType(row.lensType());
            if (row.adjustment() != null) variant.setAdditionalPrice(row.adjustment());
            if (row.quantity() != null) {
                String rowInventoryMode = row.inventoryOperation() == null
                        ? inventoryMode : row.inventoryOperation();
                variant.setQuantity("ADD".equals(rowInventoryMode) && row.existing() != null
                        ? variant.getQuantity() + row.quantity() : row.quantity());
            }
            if (row.existing() == null && row.reservedQuantity() != null) {
                variant.setReservedQuantity(row.reservedQuantity());
            }
        }
    }

    private void updateReturnability(Product product, ProductRow row, User actor, String mode,
                                     Map<String, ReturnableProduct> returnabilityByProductId) {
        Boolean nonReturnable = row.nonReturnable();
        if (nonReturnable == null && row.existing() != null) return;
        ReturnableProduct eligibility = returnabilityByProductId.computeIfAbsent(product.getId(),
                id -> new ReturnableProduct(id));
        eligibility.setEnabled(!Boolean.TRUE.equals(nonReturnable));
        eligibility.setUpdatedBy(actor);
        eligibility.setUpdatedAt(Instant.now());
        returnableProducts.save(eligibility);
    }

    private Category resolveCategory(String name, boolean creating, CategoryIndex categoryIndex) {
        List<Category> matches = categoryIndex.byName().getOrDefault(key(name), List.of());
        if (matches.size() == 1 && "ACTIVE".equals(matches.get(0).getStatus())) return matches.get(0);
        if (!creating) throw new IllegalStateException("A category changed after the import preview.");
        Category category = new Category();
        category.setName(name);
        String baseSlug = slug(name);
        String candidate = baseSlug;
        int suffix = 2;
        while (categoryIndex.slugs().contains(key(candidate))) candidate = baseSlug + "-" + suffix++;
        category.setSlug(candidate);
        category.setStatus("ACTIVE");
        category.setCategoryType("CATALOG");
        Category saved = categories.save(category);
        categoryIndex.byName().put(key(name), new ArrayList<>(List.of(saved)));
        categoryIndex.slugs().add(key(candidate));
        return saved;
    }

    private StoredImage storedImage(String filename, Map<String, ImageAsset> assets,
                                    Map<String, StoredImage> storedImages) {
        StoredImage alreadyStored = storedImages.get(filename);
        if (alreadyStored != null) return alreadyStored;
        ImageAsset asset = assets.get(filename);
        if (asset == null) throw new IllegalStateException("A validated image file was not available.");
        MultipartFile file = new ByteArrayMultipartFile(asset.filename(), asset.contentType(), asset.bytes());
        try {
            PrescriptionStorage.StoredFile stored = imageStorage.store(file);
            StoredImage result = new StoredImage(IMAGE_PATH + stored.storageKey(), stored.storageKey());
            storedImages.put(filename, result);
            return result;
        } catch (IOException | SecurityException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "IMAGE_STORAGE_FAILED",
                    "One or more product images could not be stored.", exception);
        }
    }

    private ExportData exportData(List<Product> selected, boolean includeImages) throws IOException {
        List<Map<String, Object>> productRows = new ArrayList<>();
        List<Map<String, Object>> variantRows = new ArrayList<>();
        Map<String, byte[]> archiveImages = new LinkedHashMap<>();
        Map<String, ReturnableProduct> returnabilityByProductId = returnableProducts
                .findAllByProductIdIn(selected.stream().map(Product::getId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(ReturnableProduct::getProductId, value -> value));
        for (Product product : selected) {
            String safeSku = safeFilenamePart(product.getSku());
            String suffix = product.getId().replace("-", "").substring(0, 8);
            List<ProductImage> images = product.getImages().stream()
                    .sorted(Comparator.comparing(ProductImage::isPrimaryImage).reversed()
                            .thenComparingInt(ProductImage::getSortOrder)).toList();
            List<String> imageNames = new ArrayList<>();
            String mainImage = "";
            int galleryNumber = 0;
            for (ProductImage image : images) {
                String name = exportImageName(product, image.getStorageKey(), image.getImageUrl(), safeSku,
                        suffix, image.isPrimaryImage() ? "main" : "gallery_" + (++galleryNumber),
                        includeImages, archiveImages);
                if (name.isBlank()) continue;
                if (image.isPrimaryImage() || mainImage.isBlank()) mainImage = name;
                else imageNames.add(name);
            }
            String tryOn = exportImageName(product, null, product.getTryOnImageUrl(), safeSku, suffix,
                    "tryon", includeImages, archiveImages);
            ReturnableProduct returnability = returnabilityByProductId.get(product.getId());
            ProductImportJobReturnability ret = new ProductImportJobReturnability(
                    returnability == null || !returnability.isEnabled());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("SKU", product.getSku());
            row.put("Product Name", product.getName());
            row.put("Slug", product.getSlug());
            row.put("Brand", product.getBrand());
            row.put("Base Price", product.getBasePrice());
            row.put("Compare-at Price", product.getCompareAtPrice());
            row.put("Material", product.getMaterial());
            row.put("Gender", product.getGender());
            row.put("Frame Shape", product.getFrameShape());
            row.put("Frame Type", product.getFrameType());
            row.put("Badge", product.getBadge());
            row.put("Status", product.getStatus());
            row.put("HSN Code", product.getHsnCode());
            row.put("GST Applicable", product.isGstEnabled() ? "YES" : "NO");
            row.put("Use Global GST Rate", product.getGstRate() == null ? "YES" : "NO");
            row.put("Non-returnable", ret.nonReturnable() ? "YES" : "NO");
            row.put("Description", product.getDescription());
            row.put("Category Names", product.getCategories().stream().map(Category::getName).sorted()
                    .reduce((a, b) -> a + "|" + b).orElse(""));
            row.put("Product Main Image", mainImage);
            row.put("Product Gallery Images", String.join(";", imageNames));
            row.put("Virtual Try-On Image", tryOn);
            row.put("GST Rate", product.getGstRate());
            productRows.add(row);

            product.getVariants().stream().sorted(Comparator.comparing(ProductVariant::getSku,
                    String.CASE_INSENSITIVE_ORDER)).forEach(variant -> {
                Map<String, Object> variantRow = new LinkedHashMap<>();
                variantRow.put("Product SKU", product.getSku());
                variantRow.put("Variant SKU", variant.getSku());
                variantRow.put("Color", variant.getColor());
                variantRow.put("Size", variant.getSize());
                variantRow.put("Lens Type", variant.getLensType());
                variantRow.put("Price Adjustment", variant.getAdditionalPrice());
                variantRow.put("Inventory Operation", "SET");
                variantRow.put("Quantity", variant.getQuantity());
                variantRow.put("Reserved Quantity", variant.getReservedQuantity());
                variantRows.add(variantRow);
            });
        }
        return new ExportData(productRows, variantRows, archiveImages);
    }

    private String exportImageName(Product product, String storageKey, String imageUrl,
                                   String safeSku, String suffix, String role, boolean includeImages,
                                   Map<String, byte[]> archiveImages) throws IOException {
        String key = storageKey == null || storageKey.isBlank() ? storageKeyFromUrl(imageUrl) : storageKey;
        if (key == null || !key.matches("[0-9a-fA-F-]{36}\\.(jpg|png|webp)")) return "";
        String filename = safeSku + "_" + role + "_" + suffix + "." + extension(key);
        if (includeImages) {
            try (InputStream input = imageStorage.load(key)) {
                byte[] bytes = input.readNBytes(MAX_IMAGE_BYTES + 1);
                if (bytes.length > MAX_IMAGE_BYTES) {
                    throw new IOException("Stored product image exceeds the export size limit.");
                }
                archiveImages.put("images/" + filename, bytes);
            } catch (IOException exception) {
                throw new IOException("A stored product image could not be included in the export.", exception);
            }
        }
        return filename;
    }

    private String storageKeyFromUrl(String url) {
        if (url == null) return null;
        String path = url;
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) path = java.net.URI.create(url).getPath();
        } catch (IllegalArgumentException ignored) {
            return null;
        }
        if (path == null || !path.startsWith(IMAGE_PATH)) return null;
        String key = path.substring(IMAGE_PATH.length());
        return key.matches("[0-9a-fA-F-]{36}\\.(jpg|png|webp)") ? key : null;
    }

    private void writeSummary(ProductImportJob job, ImportPlan plan, int imported) {
        job.setTotalRows(plan.totalRows());
        job.setNewProducts(plan.newProducts());
        job.setExistingProducts(plan.existingProducts());
        job.setValidRecords(plan.validRecords());
        job.setInvalidRecords(plan.invalidRecords());
        job.setMissingImages(plan.missingImages());
        job.setDuplicateSkus(plan.duplicateSkus());
        job.setInvalidCategories(plan.invalidCategories());
        job.setInvalidPrices(plan.invalidPrices());
        job.setInvalidVariants(plan.invalidVariants());
        job.setImportedRecords(imported);
    }

    private ImportSummary summary(ProductImportJob job, List<RowError> errors, ImportPlan plan) {
        return new ImportSummary(job.getId(), job.getImportMode(), job.getInventoryMode(), job.getStatus(),
                job.getTotalRows(), job.getNewProducts(), job.getExistingProducts(),
                plan.newVariants(), plan.updatedVariants(), job.getValidRecords(),
                job.getInvalidRecords(), job.getMissingImages(), job.getDuplicateSkus(), job.getInvalidCategories(),
                job.getInvalidPrices(), job.getInvalidVariants(), job.getImportedRecords(), errors);
    }

    private ImportHistoryEntry historyEntry(ProductImportJob job) {
        return new ImportHistoryEntry(job.getId(), job.getImportMode(), job.getInventoryMode(), job.getStatus(),
                job.getWorkbookName(), job.getTotalRows(), job.getNewProducts(), job.getExistingProducts(),
                job.getValidRecords(), job.getInvalidRecords(), job.getImportedRecords(),
                job.getCreatedAt(), job.getCompletedAt());
    }

    private String normalizeOption(String value, Set<String> allowed, String message) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw invalid(message);
        return normalized;
    }

    private Boolean parseYesNo(ProductRow row, String field, String value) {
        if (value == null || value.isBlank()) return null;
        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "YES" -> true;
            case "NO" -> false;
            default -> {
                row.error(field, "Enter YES or NO.");
                yield null;
            }
        };
    }

    private BigDecimal parseAmount(ProductRow row, String field, String value, boolean required) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.replace(",", "").trim()).stripTrailingZeros();
        } catch (NumberFormatException exception) {
            row.error(field, "Enter a valid number.");
            return null;
        }
    }

    private BigDecimal parseAmount(VariantRow row, String field, String value, boolean required) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.replace(",", "").trim()).stripTrailingZeros();
        } catch (NumberFormatException exception) {
            row.error(field, "Enter a valid number.");
            return null;
        }
    }

    private Integer parseInteger(VariantRow row, String field, String value, boolean required) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.replace(",", "").trim()).intValueExact();
        } catch (NumberFormatException | ArithmeticException exception) {
            row.error(field, "Enter a whole number.");
            return null;
        }
    }

    private boolean invalidAmount(BigDecimal value) {
        return value.compareTo(BigDecimal.ZERO) < 0
                || value.compareTo(new BigDecimal("9999999999.99")) > 0
                || value.scale() > 2;
    }

    private void validateLength(ProductRow row, String field, String value, int limit, boolean required) {
        if (value == null) {
            if (required) row.error(field, field + " is required for a new product.");
        } else if (value.length() > limit) {
            row.error(field, field + " exceeds the maximum length of " + limit + " characters.");
        }
    }

    private void validateVariantLength(VariantRow row, String field, String value, int limit) {
        if (value != null && value.length() > limit) {
            row.error(field, field + " exceeds the maximum length of " + limit + " characters.");
        }
    }

    private List<String> parseNames(String raw, String separator) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split(separator)).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
    }

    private String safeFilename(String filename) {
        if (filename == null) return "products.xlsx";
        String name = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private String safeFilenamePart(String value) {
        String sanitized = value == null ? "" : value.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.isBlank() ? "product" : sanitized.substring(0, Math.min(80, sanitized.length()));
    }

    private String safeText(String value, int maximum) {
        if (value == null) return "";
        return value.replaceAll("[\\p{Cntrl}]", "").substring(0, Math.min(value.length(), maximum));
    }

    private String extension(String filename) {
        int dot = filename == null ? -1 : filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String slug(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    private String key(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private int countErrors(List<RowError> errors, String contains) {
        return (int) errors.stream()
                .filter(error -> error.message().toLowerCase(Locale.ROOT).contains(contains))
                .count();
    }

    private boolean optionalEquals(String left, String right) {
        return left == null ? right == null : left.equals(right);
    }

    private String sha256(byte[] bytes) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private void addZipEntry(ZipOutputStream zip, String name, byte[] bytes) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(bytes);
        zip.closeEntry();
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PRODUCT_IMPORT", message);
    }

    public record ExportFile(String filename, String contentType, byte[] bytes) {}

    private record UploadedImport(byte[] workbookBytes, byte[] archiveBytes, Map<String, ImageAsset> images,
                                  ProductBulkWorkbook.WorkbookData data) {}

    private record ImageAsset(String filename, byte[] bytes, String contentType) {}

    private record StoredImage(String url, String storageKey) {}

    private record ProductImportJobReturnability(boolean nonReturnable) {}

    private record CategoryIndex(Map<String, List<Category>> byName, Set<String> slugs) {}

    private record ExportData(List<Map<String, Object>> products, List<Map<String, Object>> variants,
                              Map<String, byte[]> images) {}

    private record ImportPlan(String mode, String inventoryMode, List<ProductRow> products,
                              Map<String, List<VariantRow>> variantsByProduct, Map<String, ImageAsset> images,
                              List<RowError> errors, int totalRows, int newProducts, int existingProducts,
                              int newVariants, int updatedVariants,
                              int validRecords, int invalidRecords, int missingImages, int duplicateSkus,
                              int invalidCategories, int invalidPrices, int invalidVariants) {}

    private static final class ProductRow {
        private final ProductBulkWorkbook.DataRow raw;
        private final List<RowError> errors = new ArrayList<>();
        private String sku = "";
        private String name;
        private String slug;
        private String normalizedSlug;
        private String brand;
        private String description;
        private String material;
        private String gender;
        private String frameShape;
        private String frameType;
        private String badge;
        private String status;
        private String hsnCode;
        private Boolean gstEnabled;
        private Boolean useGlobalGst;
        private Boolean nonReturnable;
        private List<String> categoryNames = List.of();
        private String mainImage;
        private List<String> galleryImages = List.of();
        private String tryOnImage;
        private BigDecimal basePrice;
        private BigDecimal compareAtPrice;
        private BigDecimal gstRate;
        private Product existing;

        ProductRow(ProductBulkWorkbook.DataRow raw) { this.raw = raw; }
        void error(String field, String message) { errors.add(new RowError(PRODUCT_SHEET, raw.row(), sku, field, message)); }
        List<RowError> errors() { return errors; }
        String sku() { return sku; } void sku(String value) { sku = value; }
        String name() { return name; } void name(String value) { name = value; }
        String slug() { return slug; } void slug(String value) { slug = value; }
        String normalizedSlug() { return normalizedSlug; } void normalizedSlug(String value) { normalizedSlug = value; }
        String brand() { return brand; } void brand(String value) { brand = value; }
        String description() { return description; } void description(String value) { description = value; }
        String material() { return material; } void material(String value) { material = value; }
        String gender() { return gender; } void gender(String value) { gender = value; }
        String frameShape() { return frameShape; } void frameShape(String value) { frameShape = value; }
        String frameType() { return frameType; } void frameType(String value) { frameType = value; }
        String badge() { return badge; } void badge(String value) { badge = value; }
        String status() { return status; } void status(String value) { status = value; }
        String hsnCode() { return hsnCode; } void hsnCode(String value) { hsnCode = value; }
        Boolean gstEnabled() { return gstEnabled; } void gstEnabled(Boolean value) { gstEnabled = value; }
        Boolean useGlobalGst() { return useGlobalGst; } void useGlobalGst(Boolean value) { useGlobalGst = value; }
        Boolean nonReturnable() { return nonReturnable; } void nonReturnable(Boolean value) { nonReturnable = value; }
        List<String> categoryNames() { return categoryNames; } void categoryNames(List<String> value) { categoryNames = value; }
        String mainImage() { return mainImage; } void mainImage(String value) { mainImage = value; }
        List<String> galleryImages() { return galleryImages; } void galleryImages(List<String> value) { galleryImages = value; }
        String tryOnImage() { return tryOnImage; } void tryOnImage(String value) { tryOnImage = value; }
        BigDecimal basePrice() { return basePrice; } void basePrice(BigDecimal value) { basePrice = value; }
        BigDecimal compareAtPrice() { return compareAtPrice; } void compareAtPrice(BigDecimal value) { compareAtPrice = value; }
        BigDecimal gstRate() { return gstRate; } void gstRate(BigDecimal value) { gstRate = value; }
        Product existing() { return existing; } void existing(Product value) { existing = value; }
    }

    private static final class VariantRow {
        private final ProductBulkWorkbook.DataRow raw;
        private final List<RowError> errors = new ArrayList<>();
        private String productSku = "";
        private String sku = "";
        private String color;
        private String size;
        private String lensType;
        private BigDecimal adjustment;
        private String inventoryOperation;
        private Integer quantity;
        private Integer reservedQuantity;
        private ProductVariant existing;

        VariantRow(ProductBulkWorkbook.DataRow raw) { this.raw = raw; }
        void error(String field, String message) { errors.add(new RowError(VARIANT_SHEET, raw.row(), sku, field, message)); }
        List<RowError> errors() { return errors; }
        String productSku() { return productSku; } void productSku(String value) { productSku = value; }
        String sku() { return sku; } void sku(String value) { sku = value; }
        String color() { return color; } void color(String value) { color = value; }
        String size() { return size; } void size(String value) { size = value; }
        String lensType() { return lensType; } void lensType(String value) { lensType = value; }
        BigDecimal adjustment() { return adjustment; } void adjustment(BigDecimal value) { adjustment = value; }
        String inventoryOperation() { return inventoryOperation; } void inventoryOperation(String value) { inventoryOperation = value; }
        Integer quantity() { return quantity; } void quantity(Integer value) { quantity = value; }
        Integer reservedQuantity() { return reservedQuantity; } void reservedQuantity(Integer value) { reservedQuantity = value; }
        ProductVariant existing() { return existing; } void existing(ProductVariant value) { existing = value; }
    }

    private static class ByteArrayMultipartFile implements MultipartFile {
        private final String filename;
        private final String contentType;
        private final byte[] bytes;

        ByteArrayMultipartFile(String filename, String contentType, byte[] bytes) {
            this.filename = filename;
            this.contentType = contentType;
            this.bytes = bytes;
        }

        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return filename; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return bytes.length == 0; }
        @Override public long getSize() { return bytes.length; }
        @Override public byte[] getBytes() { return bytes.clone(); }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
        @Override public void transferTo(File destination) throws IOException {
            java.nio.file.Files.write(destination.toPath(), bytes);
        }
    }
}
