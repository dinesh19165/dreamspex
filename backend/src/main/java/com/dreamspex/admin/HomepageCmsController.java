package com.dreamspex.admin;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import static com.dreamspex.admin.HomepageCmsDtos.*;

@RestController
public class HomepageCmsController {
 private final HomepageCmsService service; public HomepageCmsController(HomepageCmsService s){service=s;}
 @GetMapping("/api/v1/homepage") HomepageResponse homepage(){return service.publicHome();}
 @GetMapping("/api/v1/homepage/banners") java.util.List<BannerResponse> banners(){return service.publicHome().banners();}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @GetMapping("/api/v1/admin/cms/homepage") HomepageResponse admin(){return service.adminHome();}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @GetMapping("/api/v1/admin/cms/cards") HomepageCardsPage cards(@RequestParam(required=false) String sectionKey,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int pageSize){return service.pageCards(sectionKey,page,pageSize);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PostMapping("/api/v1/admin/cms/cards") @ResponseStatus(HttpStatus.CREATED) HomepageCardResponse createCard(Authentication a,@Valid @RequestBody HomepageCardRequest r){return service.saveCard(a,null,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PutMapping("/api/v1/admin/cms/cards/{id}") HomepageCardResponse updateCard(Authentication a,@PathVariable String id,@Valid @RequestBody HomepageCardRequest r){return service.saveCard(a,id,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @DeleteMapping("/api/v1/admin/cms/cards/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteCard(Authentication a,@PathVariable String id){service.deleteCard(a,id);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PostMapping("/api/v1/admin/cms/banners") @ResponseStatus(HttpStatus.CREATED) BannerResponse createBanner(Authentication a,@Valid @RequestBody BannerRequest r){return service.saveBanner(a,null,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PutMapping("/api/v1/admin/cms/banners/{id}") BannerResponse updateBanner(Authentication a,@PathVariable String id,@Valid @RequestBody BannerRequest r){return service.saveBanner(a,id,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @DeleteMapping("/api/v1/admin/cms/banners/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteBanner(Authentication a,@PathVariable String id){service.deleteBanner(a,id);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PatchMapping("/api/v1/admin/cms/banners/{id}/status") BannerResponse bannerStatus(Authentication a,@PathVariable String id,@RequestParam String value){return service.updateBannerStatus(a,id,value);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PostMapping("/api/v1/admin/cms/sections") @ResponseStatus(HttpStatus.CREATED) SectionResponse createSection(Authentication a,@Valid @RequestBody SectionRequest r){return service.saveSection(a,null,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PutMapping("/api/v1/admin/cms/sections/{id}") SectionResponse updateSection(Authentication a,@PathVariable String id,@Valid @RequestBody SectionRequest r){return service.saveSection(a,id,r);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @DeleteMapping("/api/v1/admin/cms/sections/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteSection(Authentication a,@PathVariable String id){service.deleteSection(a,id);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PostMapping("/api/v1/admin/cms/images") @ResponseStatus(HttpStatus.CREATED) UploadResponse upload(Authentication a,@RequestParam MultipartFile file){return service.upload(a,file);}
 @PreAuthorize("hasRole('SUPER_ADMIN')")
 @PostMapping("/api/v1/admin/cms/videos") @ResponseStatus(HttpStatus.CREATED) UploadResponse uploadVideo(Authentication a,@RequestParam MultipartFile file){return service.uploadVideo(a,file);}
}
