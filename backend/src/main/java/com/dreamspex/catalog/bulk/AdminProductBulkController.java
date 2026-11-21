package com.dreamspex.catalog.bulk;

import com.dreamspex.security.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import static com.dreamspex.catalog.bulk.ProductBulkDtos.*;

@RestController
@RequestMapping("/api/v1/admin/products/bulk")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminProductBulkController {
    private static final String XLSX_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ProductBulkService bulk;
    private final CurrentUser current;

    public AdminProductBulkController(ProductBulkService bulk, CurrentUser current) {
        this.bulk = bulk;
        this.current = current;
    }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        return download("DreamSpex_Product_Import_Template.xlsx", XLSX_TYPE, bulk.template());
    }

    @GetMapping("/export")
    ResponseEntity<byte[]> export(@RequestParam(required = false) List<String> productIds,
                                  @RequestParam(required = false) String categoryId,
                                  @RequestParam(required = false) String status,
                                  @RequestParam(defaultValue = "false") boolean archive) {
        ProductBulkService.ExportFile file = bulk.export(productIds, categoryId, status, archive);
        return download(file.filename(), file.contentType(), file.bytes());
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ImportSummary preview(Authentication authentication,
                          @RequestParam("workbook") MultipartFile workbook,
                          @RequestParam(value = "imagesZip", required = false) MultipartFile imagesZip,
                          @RequestParam("mode") String mode,
                          @RequestParam(value = "inventoryMode", defaultValue = "SET") String inventoryMode) {
        return bulk.preview(current.require(authentication), workbook, imagesZip, mode, inventoryMode);
    }

    @PostMapping(value = "/{jobId}/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ImportSummary importProducts(Authentication authentication, @PathVariable String jobId,
                                 @RequestParam("workbook") MultipartFile workbook,
                                 @RequestParam(value = "imagesZip", required = false) MultipartFile imagesZip) {
        return bulk.importProducts(current.require(authentication), jobId, workbook, imagesZip);
    }

    @GetMapping("/history")
    List<ImportHistoryEntry> history() {
        return bulk.history();
    }

    @GetMapping("/history/{jobId}/errors")
    ResponseEntity<byte[]> errorReport(@PathVariable String jobId) {
        return download("DreamSpex_Product_Import_Errors.xlsx", XLSX_TYPE, bulk.errorReport(jobId));
    }

    private ResponseEntity<byte[]> download(String filename, String contentType, byte[] bytes) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8).build());
        headers.setContentLength(bytes.length);
        headers.setCacheControl("no-store");
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
