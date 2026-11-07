package com.dreamspex.admin;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
public final class HomepageCmsDtos { private HomepageCmsDtos(){}
 public record BannerRequest(@NotBlank @Size(max=180) String title,@Size(max=500) String subtitle,@Size(max=5000) String description,@Size(max=1000) String desktopImageUrl,@Size(max=1000) String mobileImageUrl,@Size(max=500) String desktopStorageKey,@Size(max=500) String mobileStorageKey,@Size(max=16) String desktopMediaType,@Size(max=1000) String desktopVideoUrl,@Size(max=500) String desktopVideoStorageKey,@Size(max=120) String buttonText,@Size(max=1000) String linkUrl,@Size(max=120) String secondaryButtonText,@Size(max=1000) String secondaryLinkUrl,@Size(max=80) String positioning,@Min(0) int sortOrder,@NotBlank String status,Instant startsAt,Instant endsAt){}
 public record SectionRequest(@NotBlank @Size(max=120) String slug,@NotBlank @Size(max=40) String sectionType,@Size(max=180) String title,@Size(max=500) String subtitle,@Size(max=10000) String contentJson,@Min(0) int displayOrder,@NotBlank String status,boolean enabled,List<String> productIds,List<String> categoryIds){}
 public record BannerResponse(String id,String title,String subtitle,String description,String desktopImageUrl,String mobileImageUrl,String desktopStorageKey,String mobileStorageKey,String desktopMediaType,String desktopVideoUrl,String desktopVideoStorageKey,String buttonText,String linkUrl,String secondaryButtonText,String secondaryLinkUrl,String positioning,int sortOrder,String status,Instant startsAt,Instant endsAt){}
 public record SectionResponse(String id,String slug,String sectionType,String title,String subtitle,String contentJson,int displayOrder,String status,boolean enabled,List<ProductCard> products,List<CategoryCard> categories){}
 public record ProductCard(String id,String name,String slug,String brand,java.math.BigDecimal price,java.math.BigDecimal compareAtPrice,String imageUrl,String badge,String description,String category){}
 public record CategoryCard(String id,String name,String slug,String imageUrl){}
 public record HomepageCardRequest(@NotBlank @Size(max=40) String sectionKey,@NotBlank @Size(max=180) String title,@Size(max=500) String subtitle,@Size(max=5000) String description,@Size(max=1000) String imageUrl,@Size(max=500) String imageStorageKey,@Size(max=120) String buttonText,@NotBlank @Size(max=16) String destinationType,@NotBlank @Size(max=500) String destinationValue,@Min(0) int displayOrder,@NotBlank @Size(max=16) String status,boolean enabled){}
 public record HomepageCardResponse(String id,String sectionKey,String title,String subtitle,String description,String imageUrl,String imageStorageKey,String buttonText,String destinationType,String destinationValue,int displayOrder,String status,boolean enabled,ProductCard product,CategoryCard category){}
 public record HomepageCardsPage(List<HomepageCardResponse> items,int page,int pageSize,long total){}
 public record HomepageResponse(List<BannerResponse> banners,List<SectionResponse> sections,List<HomepageCardResponse> cards){}
 public record UploadResponse(String url,String storageKey){}
}
