package com.dreamspex.catalog.bulk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import com.dreamspex.admin.HomepageImageStorage;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.franchise.FranchiseService;
import com.dreamspex.returns.ReturnableProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

class ProductBulkWorkbookTest {
    @Test
    void templateHasImportSheetsAndCanBeParsed() throws Exception {
        byte[] template = ProductBulkWorkbook.template();

        try (var workbook = WorkbookFactory.create(new java.io.ByteArrayInputStream(template))) {
            assertEquals(3, workbook.getNumberOfSheets());
            assertEquals("Products", workbook.getSheetAt(0).getSheetName());
            assertEquals("Variants & Inventory", workbook.getSheetAt(1).getSheetName());
            assertEquals("Instructions", workbook.getSheetAt(2).getSheetName());
            assertTrue(workbook.getSheet("Products").getDataValidations().size() >= 4);
            assertArrayEquals(new String[]{"SET", "ADD"}, workbook.getSheet("Variants & Inventory")
                    .getDataValidations().get(0).getValidationConstraint().getExplicitListValues());
            assertEquals("Price Adjustment", workbook.getSheet("Variants & Inventory").getRow(0).getCell(5).getStringCellValue());
        }
        assertTrue(ProductBulkWorkbook.parse(template).products().isEmpty());
        assertTrue(ProductBulkWorkbook.parse(template).variants().isEmpty());
    }

    @Test
    void parserGroupsMultipleVariantsAndReadsLegacyAdjustmentColumn() throws Exception {
        byte[] template = ProductBulkWorkbook.template();
        byte[] workbookBytes;
        try (var workbook = WorkbookFactory.create(new java.io.ByteArrayInputStream(template));
             var output = new ByteArrayOutputStream()) {
            Sheet variants = workbook.getSheet("Variants & Inventory");
            variants.getRow(0).getCell(5).setCellValue("Adjustment");
            for (int i = 0; i < 4; i++) {
                Row row = variants.createRow(i + 1);
                row.createCell(0).setCellValue("DS-1");
                row.createCell(1).setCellValue("DS-1-V" + (i + 1));
                row.createCell(2).setCellValue("Color " + i);
                row.createCell(4).setCellValue(i % 2 == 0 ? "Single Vision" : "Progressive");
                row.createCell(5).setCellValue(i * 10);
                row.createCell(6).setCellValue(i % 2 == 0 ? "SET" : "ADD");
                row.createCell(7).setCellValue(10 + i);
            }
            workbook.write(output);
            workbookBytes = output.toByteArray();
        }

        ProductBulkWorkbook.WorkbookData parsed = ProductBulkWorkbook.parse(workbookBytes);

        assertEquals(4, parsed.variants().size());
        assertEquals("DS-1", parsed.variants().get(3).get("Product SKU"));
        assertEquals("DS-1-V4", parsed.variants().get(3).get("Variant SKU"));
        assertEquals("30", parsed.variants().get(3).get("Price Adjustment"));
        assertEquals("ADD", parsed.variants().get(3).get("Inventory Operation"));
    }

    @Test
    void parserRejectsFormulaCells() throws Exception {
        byte[] template = ProductBulkWorkbook.template();
        byte[] workbookBytes;
        try (var workbook = WorkbookFactory.create(new java.io.ByteArrayInputStream(template));
             var output = new ByteArrayOutputStream()) {
            Row product = workbook.getSheet("Products").createRow(1);
            product.createCell(0).setCellFormula("1+1");
            workbook.write(output);
            workbookBytes = output.toByteArray();
        }

        IOException error = assertThrows(IOException.class, () -> ProductBulkWorkbook.parse(workbookBytes));
        assertTrue(error.getMessage().contains("Formula cells are not supported"));
    }

    @Test
    void previewRejectsZipPathTraversal() throws Exception {
        ByteArrayOutputStream archive = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(archive)) {
            zip.putNextEntry(new ZipEntry("../outside.jpg"));
            zip.write(new byte[]{1, 2, 3});
            zip.closeEntry();
        }
        ProductBulkService service = new ProductBulkService(
                mock(ProductRepository.class),
                mock(ProductVariantRepository.class),
                mock(CategoryRepository.class),
                mock(ReturnableProductRepository.class),
                mock(ProductImportJobRepository.class),
                mock(HomepageImageStorage.class),
                mock(FranchiseService.class),
                mock(AuditLogService.class),
                new ObjectMapper());
        MockMultipartFile workbook = new MockMultipartFile("workbook", "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ProductBulkWorkbook.template());
        MockMultipartFile images = new MockMultipartFile("imagesZip", "images.zip", "application/zip",
                archive.toByteArray());

        ApiException error = assertThrows(ApiException.class,
                () -> service.preview(null, workbook, images, "CREATE", "SET"));
        assertTrue(error.getMessage().contains("unsafe file path"));
    }
}
