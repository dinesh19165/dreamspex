package com.dreamspex.catalog.controller;


import com.dreamspex.catalog.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.dreamspex.catalog.dto.CatalogDtos.*;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {
    private final CatalogService service;
    public CategoryController(CatalogService service) { this.service = service; }
    @GetMapping List<CategoryResponse> list(@RequestParam(defaultValue = "CATALOG") String type) { return service.publicCategories(type); }
    @GetMapping("/{slug}") CategoryResponse get(@PathVariable String slug) { return service.publicCategory(slug); }
    @PostMapping @PreAuthorize("hasRole('SUPER_ADMIN')") @ResponseStatus(HttpStatus.CREATED)
    CategoryResponse create(@Valid @RequestBody CategoryRequest request) { return service.saveCategory(null, request); }
    @PatchMapping("/{id}") @PreAuthorize("hasRole('SUPER_ADMIN')")
    CategoryResponse update(@PathVariable String id, @Valid @RequestBody CategoryRequest request) { return service.saveCategory(id, request); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('SUPER_ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) { service.deleteCategory(id); }
}
