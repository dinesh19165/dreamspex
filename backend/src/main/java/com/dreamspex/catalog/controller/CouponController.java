package com.dreamspex.catalog.controller;


import com.dreamspex.catalog.service.CouponService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.dreamspex.catalog.dto.CatalogDtos.*;

@RestController
@RequestMapping("/api/v1")
public class CouponController {
    private final CouponService service;

    public CouponController(CouponService service) {
        this.service = service;
    }

    @GetMapping("/offers")
    List<OfferResponse> offers() {
        return service.offers();
    }

    @PostMapping("/coupons/validate")
    @PreAuthorize("hasRole('CUSTOMER')")
    CouponResponse validate(Authentication authentication, @Valid @RequestBody CouponRequest request) {
        return service.validate(authentication, request);
    }

    @GetMapping("/admin/offers")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    List<OfferResponse> adminOffers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String publicationStatus,
            @RequestParam(required = false) Boolean active) {
        return service.adminOffers(q, category, publicationStatus, active);
    }

    @PostMapping("/admin/offers")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    OfferResponse createOffer(Authentication authentication, @Valid @RequestBody OfferRequest request) {
        return service.saveOffer(authentication, null, request);
    }

    @PutMapping("/admin/offers/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    OfferResponse updateOffer(Authentication authentication, @PathVariable String id, @Valid @RequestBody OfferRequest request) {
        return service.saveOffer(authentication, id, request);
    }

    @DeleteMapping("/admin/offers/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteOffer(Authentication authentication, @PathVariable String id) {
        service.deleteOffer(authentication, id);
    }
}
