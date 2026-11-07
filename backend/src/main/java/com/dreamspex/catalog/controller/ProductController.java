package com.dreamspex.catalog.controller;


import com.dreamspex.catalog.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import static com.dreamspex.catalog.dto.CatalogDtos.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    private final CatalogService service;
    public ProductController(CatalogService service) { this.service = service; }
    @GetMapping("/filters") ProductFilterOptions filters() { return service.productFilterOptions(); }
    @GetMapping PageResponse<ProductResponse> search(@RequestParam(required=false) String q, @RequestParam(required=false) String brand,
            @RequestParam(required=false) String category, @RequestParam(required=false) String material,
            @RequestParam(required=false) String gender, @RequestParam(required=false) String frameShape,
            @RequestParam(required=false) String frameType, @RequestParam(required=false) String color,
            @RequestParam(required=false) String badge, @RequestParam(defaultValue="false") boolean availableOnly,
            @RequestParam(required=false) BigDecimal minPrice, @RequestParam(required=false) BigDecimal maxPrice, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int pageSize, @RequestParam(defaultValue="newest") String sort) {
        return service.search(q, brand, category, material, gender, frameShape, frameType, color, badge,
                availableOnly, minPrice, maxPrice, page, pageSize, sort);
    }
    @GetMapping("/{id}") ProductResponse get(@PathVariable String id) { return service.publicProduct(id); }
    @PostMapping @PreAuthorize("hasRole('SUPER_ADMIN')") @ResponseStatus(HttpStatus.CREATED)
    ProductResponse create(@Valid @RequestBody ProductRequest request) { return service.saveProduct(null, request); }
    @PatchMapping("/{id}") @PreAuthorize("hasRole('SUPER_ADMIN')")
    ProductResponse update(@PathVariable String id, @Valid @RequestBody ProductRequest request) { return service.saveProduct(id, request); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('SUPER_ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) { service.deleteProduct(id); }
}
