package com.dreamspex.catalog.bulk;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

final class ProductBulkWorkbook {
    static final List<String> PRODUCT_HEADERS = List.of(
            "SKU", "Product Name", "Slug", "Brand", "Base Price", "Compare-at Price",
            "Material", "Gender", "Frame Shape", "Frame Type", "Badge", "Status",
            "HSN Code", "GST Applicable", "Use Global GST Rate", "Non-returnable",
            "Description", "Category Names", "Product Main Image", "Product Gallery Images",
            "Virtual Try-On Image", "GST Rate");
    static final List<String> VARIANT_HEADERS = List.of(
            "Product SKU", "Variant SKU", "Color", "Size", "Lens Type", "Price Adjustment",
            "Inventory Operation", "Quantity", "Reserved Quantity");

    private static final List<String> REQUIRED_PRODUCT_HEADERS = List.of(
            "SKU", "Product Name", "Brand", "Base Price");

    private ProductBulkWorkbook() {}

    record DataRow(String sheet, int row, Map<String, String> values) {
        String get(String heading) {
            return values.getOrDefault(headerKey(heading), "");
        }
    }

    record WorkbookData(List<DataRow> products, List<DataRow> variants) {}

    static WorkbookData parse(byte[] bytes) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            Sheet productsSheet = workbook.getSheet("Products");
            if (productsSheet == null) {
                throw new IOException("The workbook must contain a Products sheet.");
            }
            Sheet variantsSheet = workbook.getSheet("Variants & Inventory");
            List<DataRow> productRows = readRows(productsSheet, PRODUCT_HEADERS, REQUIRED_PRODUCT_HEADERS);
            List<DataRow> variantRows = variantsSheet == null
                    ? List.of() : readRows(variantsSheet, VARIANT_HEADERS, List.of("Product SKU", "Variant SKU"));
            if (productRows.size() > 5_000 || variantRows.size() > 15_000) {
                throw new IOException("The workbook exceeds the supported limit of 5,000 products or 15,000 variants.");
            }
            return new WorkbookData(productRows, variantRows);
        } catch (org.apache.poi.EncryptedDocumentException exception) {
            throw new IOException("Password-protected workbooks are not supported.", exception);
        }
    }

    static byte[] template() throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            writeHeaderSheet(workbook, "Products", PRODUCT_HEADERS);
            writeHeaderSheet(workbook, "Variants & Inventory", VARIANT_HEADERS);
            writeInstructions(workbook);
            addListValidation(workbook.getSheet("Products"), PRODUCT_HEADERS.indexOf("Status"),
                    1, 1000, "\"DRAFT,PUBLISHED,INACTIVE\"");
            addListValidation(workbook.getSheet("Products"), PRODUCT_HEADERS.indexOf("GST Applicable"),
                    1, 1000, "\"YES,NO\"");
            addListValidation(workbook.getSheet("Products"), PRODUCT_HEADERS.indexOf("Use Global GST Rate"),
                    1, 1000, "\"YES,NO\"");
            addListValidation(workbook.getSheet("Products"), PRODUCT_HEADERS.indexOf("Non-returnable"),
                    1, 1000, "\"YES,NO\"");
            addListValidation(workbook.getSheet("Variants & Inventory"), VARIANT_HEADERS.indexOf("Inventory Operation"),
                    1, 1000, "\"SET,ADD\"");
            workbook.write(output);
            return output.toByteArray();
        }
    }

    static byte[] export(List<Map<String, Object>> products, List<Map<String, Object>> variants)
            throws IOException {
        SXSSFWorkbook workbook = new SXSSFWorkbook(100);
        workbook.setCompressTempFiles(true);
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            writeTable(workbook, "Products", PRODUCT_HEADERS, products);
            writeTable(workbook, "Variants & Inventory", VARIANT_HEADERS, variants);
            writeInstructions(workbook);
            workbook.write(output);
            return output.toByteArray();
        } finally {
            workbook.close();
            workbook.dispose();
        }
    }

    static byte[] errorReport(List<ProductBulkDtos.RowError> errors) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Import Errors");
            writeHeader(sheet, List.of("Sheet", "Excel Row", "SKU", "Field", "Error"));
            int rowNumber = 1;
            for (ProductBulkDtos.RowError error : errors) {
                Row row = sheet.createRow(rowNumber++);
                row.createCell(0).setCellValue(error.sheet());
                row.createCell(1).setCellValue(error.row());
                row.createCell(2).setCellValue(error.sku());
                row.createCell(3).setCellValue(error.field());
                row.createCell(4).setCellValue(error.message());
            }
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, rowNumber - 1), 0, 4));
            for (int i = 0; i < 5; i++) sheet.autoSizeColumn(i);
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private static List<DataRow> readRows(Sheet sheet, List<String> recognizedHeaders,
                                          List<String> requiredHeaders) throws IOException {
        Row header = sheet.getRow(0);
        if (header == null) throw new IOException("The " + sheet.getSheetName() + " sheet is missing its header row.");
        Map<String, Integer> columns = new HashMap<>();
        DataFormatter formatter = new DataFormatter(Locale.ROOT);
        for (Cell cell : header) {
            String value = cellValue(cell, formatter).trim();
            if (value.isBlank()) continue;
            String key = headerKey(value);
            if (columns.putIfAbsent(key, cell.getColumnIndex()) != null) {
                throw new IOException("The " + sheet.getSheetName() + " sheet contains duplicate column headers.");
            }
        }
        if (recognizedHeaders.contains("Price Adjustment")
                && columns.containsKey(headerKey("Price Adjustment"))
                && columns.containsKey(headerKey("Adjustment"))) {
            throw new IOException("Use only Price Adjustment; the legacy Adjustment column cannot appear beside it.");
        }
        for (String required : requiredHeaders) {
            if (!columns.containsKey(headerKey(required))) {
                throw new IOException("The " + sheet.getSheetName() + " sheet is missing the " + required + " column.");
            }
        }
        List<DataRow> result = new ArrayList<>();
        int lastRow = Math.min(sheet.getLastRowNum(), 20_000);
        for (int rowIndex = 1; rowIndex <= lastRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) continue;
            Map<String, String> values = new LinkedHashMap<>();
            boolean nonBlank = false;
            for (String recognized : recognizedHeaders) {
                Integer column = columns.get(headerKey(recognized));
                if (column == null && "Price Adjustment".equals(recognized)) {
                    column = columns.get(headerKey("Adjustment"));
                }
                String value = column == null ? "" : cellValue(row.getCell(column), formatter).trim();
                values.put(headerKey(recognized), value);
                nonBlank |= !value.isBlank();
            }
            if (nonBlank) result.add(new DataRow(sheet.getSheetName(), rowIndex + 1, values));
        }
        if (sheet.getLastRowNum() > 20_000) {
            throw new IOException("The " + sheet.getSheetName() + " sheet exceeds 20,000 rows.");
        }
        return result;
    }

    private static String cellValue(Cell cell, DataFormatter formatter) throws IOException {
        if (cell == null) return "";
        if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.FORMULA) {
            throw new IOException("Formula cells are not supported. Replace formulas with their displayed values.");
        }
        return formatter.formatCellValue(cell);
    }

    private static void writeHeaderSheet(Workbook workbook, String name, List<String> headers) {
        Sheet sheet = workbook.createSheet(name);
        writeHeader(sheet, headers);
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.size() - 1));
        for (int i = 0; i < headers.size(); i++) {
            sheet.setColumnWidth(i, Math.min(42 * 256, Math.max(16 * 256, headers.get(i).length() * 360)));
        }
    }

    private static void writeTable(Workbook workbook, String name, List<String> headers,
                                   List<Map<String, Object>> data) {
        Sheet sheet = workbook.createSheet(name);
        writeHeader(sheet, headers);
        sheet.createFreezePane(0, 1);
        for (int i = 0; i < data.size(); i++) {
            Row row = sheet.createRow(i + 1);
            Map<String, Object> values = data.get(i);
            for (int column = 0; column < headers.size(); column++) {
                Object value = values.get(headers.get(column));
                if (value == null) continue;
                Cell cell = row.createCell(column);
                if (value instanceof Number number) cell.setCellValue(number.doubleValue());
                else cell.setCellValue(value.toString());
            }
        }
        sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, data.size()), 0, headers.size() - 1));
        for (int i = 0; i < headers.size(); i++) {
            sheet.setColumnWidth(i, Math.min(42 * 256, Math.max(16 * 256, headers.get(i).length() * 360)));
        }
    }

    private static void writeHeader(Sheet sheet, List<String> headers) {
        Row row = sheet.createRow(0);
        CellStyle style = sheet.getWorkbook().createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        org.apache.poi.ss.usermodel.Font font = sheet.getWorkbook().createFont();
        font.setBold(true);
        style.setFont(font);
        for (int i = 0; i < headers.size(); i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(style);
        }
    }

    private static void writeInstructions(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Instructions");
        writeHeader(sheet, List.of("Topic", "Instructions"));
        CellStyle wrap = workbook.createCellStyle();
        wrap.setWrapText(true);
        List<String[]> instructions = List.of(
                new String[]{"Required fields", "For new products: SKU, Product Name, Brand, Base Price, Description and Product Main Image. Each variant row requires Product SKU and Variant SKU."},
                new String[]{"Accepted formats", "Upload an .xlsx workbook and an optional ZIP. Image files may be JPG, JPEG, PNG or WebP; virtual try-on images must be PNG or WebP."},
                new String[]{"Status values", "Use DRAFT, PUBLISHED or INACTIVE. Blank status defaults to DRAFT for new products and preserves the existing status on updates."},
                new String[]{"GST fields", "GST Applicable and Use Global GST Rate accept YES or NO. GST Rate is an optional extension column for a custom rate (0-100)."},
                new String[]{"Categories", "Separate category names with |. UPDATE requires existing catalogue categories. CREATE creates missing category names as active catalogue categories."},
                new String[]{"Variants", "Add one row per variant. Product SKU must match a row in Products. Variant SKU is the unique matching key. Price Adjustment is a non-negative numeric additional price, matching the Admin variant form."},
                new String[]{"Inventory", "Inventory Operation accepts SET or ADD and applies to that row's Quantity. Leave it blank to use the default selected in the import form. SET replaces quantity; ADD increases existing stock; either initializes a new variant's quantity. Reserved Quantity is accepted when creating a variant; existing reservations are system-managed and preserved."},
                new String[]{"Image filenames", "Image fields must contain exact filenames from the ZIP. Put files under images/ if desired. Separate gallery filenames with semicolons."},
                new String[]{"Image roles", "Product Main Image and Product Gallery Images are catalogue photography. Virtual Try-On Image is stored separately and never replaces catalogue images."},
                new String[]{"Update rules", "CREATE rejects existing product SKUs. UPDATE changes existing SKUs only. Blank fields preserve existing values; omitted variants and images are not deleted. Existing reserved quantities are preserved."},
                new String[]{"Safety", "Invalid product rows are skipped. Invalid variant rows are skipped individually. Preview and validate the workbook before importing."}
        );
        int rowIndex = 1;
        for (String[] values : instructions) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(values[0]);
            row.createCell(1).setCellValue(values[1]);
            row.getCell(1).setCellStyle(wrap);
        }
        sheet.setColumnWidth(0, 26 * 256);
        sheet.setColumnWidth(1, 110 * 256);
        sheet.createFreezePane(0, 1);
    }

    private static void addListValidation(Sheet sheet, int column, int firstRow, int lastRow, String values) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = helper.createExplicitListConstraint(values.substring(1, values.length() - 1).split(","));
        DataValidation validation = helper.createValidation(
                constraint, new CellRangeAddressList(firstRow, lastRow, column, column));
        validation.setShowErrorBox(true);
        sheet.addValidationData(validation);
    }

    private static String headerKey(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
