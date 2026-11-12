package com.dreamspex.franchise;

import com.dreamspex.franchise.FranchiseApplicationDtos.CreateRequest;
import com.dreamspex.franchise.FranchiseApplicationDtos.CreatedResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/franchise-applications")
public class PublicFranchiseApplicationController {
    private final FranchiseApplicationService service;

    public PublicFranchiseApplicationController(FranchiseApplicationService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedResponse create(@Valid @RequestBody CreateRequest request) {
        return service.submit(request);
    }
}
