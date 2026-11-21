package com.dreamspex.catalog.bulk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.dreamspex.admin.HomepageImageStorage;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.franchise.FranchiseService;
import com.dreamspex.prescription.PrescriptionStorage;
import com.dreamspex.returns.ReturnableProduct;
import com.dreamspex.returns.ReturnableProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class ProductBulkServiceTest {
    private static final String XLSX_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Mock ProductRepository products;
    @Mock ProductVariantRepository variants;
    @Mock CategoryRepository categories;
    @Mock ReturnableProductRepository returnableProducts;
    @Mock ProductImportJobRepository jobs;
    @Mock HomepageImageStorage imageStorage;
    @Mock FranchiseService franchises;
    @Mock AuditLogService audit;

    @Test
    void importsOneProductWithOneVariant() throws Exception {
        ImportRun run = createImport(1, 1);

        assertEquals(1, run.preview().newProducts());
        assertEquals(1, run.preview().newVariants());
        assertEquals(0, run.preview().updatedVariants());
        assertEquals(2, run.result().importedRecords());
        assertEquals(1, run.products().size());
        assertEquals(1, run.products().get(0).getVariants().size());
    }

    @Test
    void groupsFourVariantRowsUnderOneProduct() throws Exception {
        ImportRun run = createImport(1, 4);

        assertEquals(1, run.preview().newProducts());
        assertEquals(4, run.preview().newVariants());
        assertEquals(5, run.result().importedRecords());
        assertEquals(1, run.products().size());
        assertEquals(4, run.products().get(0).getVariants().size());
        assertTrue(run.products().get(0).getVariants().stream()
                .allMatch(variant -> variant.getProduct() == run.products().get(0)));
    }

    @Test
    void importsMultipleVariantsForTenProductsWithoutDuplicatingProducts() throws Exception {
        ImportRun run = createImport(10, 3);

        assertEquals(10, run.preview().newProducts());
        assertEquals(30, run.preview().newVariants());
        assertEquals(40, run.result().importedRecords());
        assertEquals(10, run.products().size());
        assertTrue(run.products().stream().allMatch(product -> product.getVariants().size() == 3));
    }

    @Test
    void updatesExistingVariantsAndUsesInventoryOperationPerRow() throws Exception {
        Product existing = product("PRODUCT-1");
        existing.setName("Old product name");
        ProductVariant existingVariant = variant(existing, "VAR-1-1", 5, 2);
        existing.getVariants().add(existingVariant);
        AtomicReference<ProductImportJob> savedJob = new AtomicReference<>();
        List<Product> savedProducts = new ArrayList<>();
        configureJob(savedJob);
        when(products.findAllBySkuIn(anyCollection())).thenReturn(List.of(existing));
        when(products.findAllBySlugIn(anyCollection())).thenReturn(List.of(existing));
        when(products.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            savedProducts.add(product);
            return product;
        });
        when(variants.findAllBySkuIn(anyCollection())).thenReturn(List.of(existingVariant));
        when(categories.findAll()).thenReturn(List.of());
        when(returnableProducts.findAllByProductIdIn(anyCollection())).thenReturn(List.of());
        byte[] workbookBytes = setCell(basicWorkbook(1, 2, false),
                "Variants & Inventory", 1, ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Inventory Operation"), "ADD");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Quantity"), "4");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Reserved Quantity"), "");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 2,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Reserved Quantity"), "1");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 2,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Quantity"), "2");
        MockMultipartFile workbook = workbookFile(workbookBytes);
        User actor = actor();
        ProductBulkService service = service();

        ProductBulkDtos.ImportSummary preview = service.preview(actor, workbook, null, "UPDATE", "SET");
        ProductBulkDtos.ImportSummary result = service.importProducts(actor, preview.jobId(), workbook, null);

        assertEquals(1, preview.existingProducts());
        assertEquals(1, preview.updatedVariants());
        assertEquals(1, preview.newVariants());
        assertEquals(1, savedProducts.size());
        assertEquals("Product 1", existing.getName());
        assertEquals(9, existingVariant.getQuantity());
        assertEquals(2, existingVariant.getReservedQuantity());
        assertEquals(2, existing.getVariants().size());
        ProductVariant added = existing.getVariants().stream()
                .filter(variant -> "VAR-1-2".equals(variant.getSku())).findFirst().orElseThrow();
        assertEquals(2, added.getQuantity());
        assertEquals(1, added.getReservedQuantity());
        assertEquals(3, result.importedRecords());
    }

    @Test
    void invalidVariantSkuQuantityAndAdjustmentAreReportedByExcelRow() throws Exception {
        AtomicReference<ProductImportJob> savedJob = new AtomicReference<>();
        configureJob(savedJob);
        when(products.findAllBySkuIn(anyCollection())).thenReturn(List.of());
        when(products.findAllBySlugIn(anyCollection())).thenReturn(List.of());
        when(variants.findAllBySkuIn(anyCollection())).thenReturn(List.of());
        when(categories.findAll()).thenReturn(List.of());
        byte[] workbookBytes = basicWorkbook(1, 2, true);
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Variant SKU"), "BAD SKU");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Quantity"), "1.5");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Price Adjustment"), "SET");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 1,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Inventory Operation"), "INVALID");
        workbookBytes = setCell(workbookBytes, "Variants & Inventory", 2,
                ProductBulkWorkbook.VARIANT_HEADERS.indexOf("Variant SKU"), "BAD SKU");

        ProductBulkDtos.ImportSummary preview = service().preview(actor(), workbookFile(workbookBytes),
                imageFile(imageZip(1)), "CREATE", "SET");

        assertEquals(2, preview.invalidVariants());
        assertEquals(0, preview.newVariants());
        assertTrue(preview.errors().stream().anyMatch(error ->
                error.row() == 2 && "Variant SKU".equals(error.field())));
        assertTrue(preview.errors().stream().anyMatch(error ->
                error.row() == 3 && error.message().contains("Duplicate variant SKU")));
        assertTrue(preview.errors().stream().anyMatch(error ->
                error.row() == 2 && "Quantity".equals(error.field())));
        assertTrue(preview.errors().stream().anyMatch(error ->
                error.row() == 2 && "Price Adjustment".equals(error.field())));
        assertTrue(preview.errors().stream().anyMatch(error ->
                error.row() == 2 && "Inventory Operation".equals(error.field())));
    }

    private ImportRun createImport(int productCount, int variantsPerProduct) throws Exception {
        AtomicReference<ProductImportJob> savedJob = new AtomicReference<>();
        List<Product> savedProducts = new ArrayList<>();
        configureJob(savedJob);
        when(products.findAllBySkuIn(anyCollection())).thenReturn(List.of());
        when(products.findAllBySlugIn(anyCollection())).thenReturn(List.of());
        when(products.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            savedProducts.add(product);
            return product;
        });
        when(variants.findAllBySkuIn(anyCollection())).thenReturn(List.of());
        when(categories.findAll()).thenReturn(List.of());
        when(returnableProducts.findAllByProductIdIn(anyCollection())).thenReturn(List.of());
        when(returnableProducts.save(any(ReturnableProduct.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(imageStorage.store(any(MultipartFile.class))).thenAnswer(invocation ->
                new PrescriptionStorage.StoredFile(
                        "00000000-0000-0000-0000-000000000001.png", "checksum", 24));

        MockMultipartFile workbook = workbookFile(basicWorkbook(productCount, variantsPerProduct, true));
        MockMultipartFile images = imageFile(imageZip(productCount));
        ProductBulkService service = service();
        User actor = actor();

        ProductBulkDtos.ImportSummary preview = service.preview(actor, workbook, images, "CREATE", "SET");
        ProductBulkDtos.ImportSummary result = service.importProducts(actor, preview.jobId(), workbook, images);
        return new ImportRun(preview, result, savedProducts);
    }

    private void configureJob(AtomicReference<ProductImportJob> savedJob) {
        when(jobs.save(any(ProductImportJob.class))).thenAnswer(invocation -> {
            ProductImportJob job = invocation.getArgument(0);
            savedJob.set(job);
            return job;
        });
        lenient().when(jobs.findWithLockById(anyString())).thenAnswer(invocation ->
                Optional.ofNullable(savedJob.get()));
    }

    private ProductBulkService service() {
        return new ProductBulkService(products, variants, categories, returnableProducts, jobs,
                imageStorage, franchises, audit, new ObjectMapper());
    }

    private User actor() {
        User actor = mock(User.class);
        when(actor.getId()).thenReturn("admin-id");
        return actor;
    }

    private static byte[] basicWorkbook(int productCount, int variantsPerProduct, boolean includeImages)
            throws Exception {
        byte[] template = ProductBulkWorkbook.template();
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(template));
             var output = new ByteArrayOutputStream()) {
            Sheet productsSheet = workbook.getSheet("Products");
            Sheet variantsSheet = workbook.getSheet("Variants & Inventory");
            for (int productIndex = 0; productIndex < productCount; productIndex++) {
                String productSku = productSku(productIndex);
                Row productRow = productsSheet.createRow(productIndex + 1);
                cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "SKU", productSku);
                cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "Product Name", "Product " + (productIndex + 1));
                cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "Brand", "Dream Spex");
                cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "Base Price", "100");
                cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "Description", "Test description");
                if (includeImages) {
                    cell(productRow, ProductBulkWorkbook.PRODUCT_HEADERS, "Product Main Image",
                            imageName(productIndex));
                }
                for (int variantIndex = 0; variantIndex < variantsPerProduct; variantIndex++) {
                    Row variantRow = variantsSheet.createRow(productIndex * variantsPerProduct + variantIndex + 1);
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Product SKU", productSku);
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Variant SKU",
                            variantSku(productIndex, variantIndex));
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Color", "Color " + variantIndex);
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Size", "Size " + variantIndex);
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Lens Type", "Lens " + variantIndex);
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Price Adjustment",
                            Integer.toString(variantIndex * 10));
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Quantity", "10");
                    cell(variantRow, ProductBulkWorkbook.VARIANT_HEADERS, "Reserved Quantity", "0");
                }
            }
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private static void cell(Row row, List<String> headers, String heading, String value) {
        row.createCell(headers.indexOf(heading)).setCellValue(value);
    }

    private static byte[] setCell(byte[] bytes, String sheetName, int rowIndex, int columnIndex, String value)
            throws Exception {
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes));
             var output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.getSheet(sheetName);
            Row row = sheet.getRow(rowIndex);
            row.createCell(columnIndex).setCellValue(value);
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private static byte[] imageZip(int productCount) throws Exception {
        try (var output = new ByteArrayOutputStream(); var zip = new ZipOutputStream(output)) {
            for (int index = 0; index < productCount; index++) {
                zip.putNextEntry(new ZipEntry("images/" + imageName(index)));
                zip.write(pngBytes());
                zip.closeEntry();
            }
            zip.finish();
            return output.toByteArray();
        }
    }

    private static byte[] pngBytes() {
        return new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    }

    private static MockMultipartFile workbookFile(byte[] bytes) {
        return new MockMultipartFile("workbook", "products.xlsx", XLSX_TYPE, bytes);
    }

    private static MockMultipartFile imageFile(byte[] bytes) {
        return new MockMultipartFile("imagesZip", "images.zip", "application/zip", bytes);
    }

    private static String productSku(int index) {
        return "PRODUCT-" + (index + 1);
    }

    private static String variantSku(int productIndex, int variantIndex) {
        return "VAR-" + (productIndex + 1) + "-" + (variantIndex + 1);
    }

    private static String imageName(int productIndex) {
        return productSku(productIndex) + "_main.png";
    }

    private static Product product(String sku) {
        Product product = new Product();
        product.setSku(sku);
        product.setName("Old product");
        product.setSlug("product-1");
        product.setBrand("Dream Spex");
        product.setDescription("Old description");
        product.setBasePrice(BigDecimal.valueOf(50));
        product.setStatus("DRAFT");
        return product;
    }

    private static ProductVariant variant(Product product, String sku, int quantity, int reserved) {
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku(sku);
        variant.setQuantity(quantity);
        variant.setReservedQuantity(reserved);
        variant.setAdditionalPrice(BigDecimal.ZERO);
        variant.setStatus("ACTIVE");
        return variant;
    }

    private record ImportRun(ProductBulkDtos.ImportSummary preview, ProductBulkDtos.ImportSummary result,
                             List<Product> products) {}
}
