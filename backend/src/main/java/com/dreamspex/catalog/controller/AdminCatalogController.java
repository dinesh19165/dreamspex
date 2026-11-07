package com.dreamspex.catalog.controller;


import com.dreamspex.catalog.service.CatalogService;
import jakarta.validation.Valid;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.security.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.dreamspex.catalog.dto.CatalogDtos.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminCatalogController {
    private final CatalogService service; private final CurrentUser current; private final AuditLogService audit;
    public AdminCatalogController(CatalogService service, CurrentUser current, AuditLogService audit) { this.service = service; this.current=current; this.audit=audit; }
    @GetMapping("/products")
    List<ProductResponse> products() { return service.adminProducts(); }
    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    ProductResponse createProduct(Authentication a,@Valid @RequestBody ProductRequest request) { ProductResponse r=service.saveProduct(null, request); audit.record(current.require(a),"PRODUCT_CREATED","PRODUCT",r.id()); return r; }
    @PatchMapping("/products/{id}")
    ProductResponse updateProduct(Authentication a,@PathVariable String id, @Valid @RequestBody ProductRequest request) { ProductResponse r=service.saveProduct(id, request); audit.record(current.require(a),"PRODUCT_UPDATED","PRODUCT",id); return r; }
    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteProduct(Authentication a,@PathVariable String id) { service.deleteProduct(id); audit.record(current.require(a),"PRODUCT_DELETED","PRODUCT",id); }
    @PatchMapping("/products/{id}/status")
    ProductResponse status(Authentication a,@PathVariable String id, @RequestParam String value) { ProductResponse r=service.setProductStatus(id, value); audit.record(current.require(a),"PRODUCT_STATUS_CHANGED","PRODUCT",id); return r; }
    @GetMapping("/categories")
    List<CategoryResponse> categories(@RequestParam(defaultValue = "CATALOG") String type) { return service.adminCategories(type); }
    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    CategoryResponse createCategory(Authentication a,@Valid @RequestBody CategoryRequest request) { CategoryResponse r=service.saveCategory(null, request); audit.record(current.require(a),"CATEGORY_CREATED","CATEGORY",r.id()); return r; }
    @PatchMapping("/categories/{id}")
    CategoryResponse updateCategory(Authentication a,@PathVariable String id, @Valid @RequestBody CategoryRequest request) { CategoryResponse r=service.saveCategory(id, request); audit.record(current.require(a),"CATEGORY_UPDATED","CATEGORY",id); return r; }
    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCategory(Authentication a,@PathVariable String id) { service.deleteCategory(id); audit.record(current.require(a),"CATEGORY_DELETED","CATEGORY",id); }
}
