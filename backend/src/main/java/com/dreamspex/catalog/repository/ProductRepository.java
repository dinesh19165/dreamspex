package com.dreamspex.catalog.repository;


import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndStatusAndDeletedAtIsNull(String id, String status);
    java.util.List<Product> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Product> findWithLockById(String id);
    boolean existsBySku(String sku);
    boolean existsBySlug(String slug);
    @Query("select distinct p.brand from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.brand is not null and p.brand <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicBrands();
    @Query("select distinct p.material from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.material is not null and p.material <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicMaterials();
    @Query("select distinct p.gender from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.gender is not null and p.gender <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicGenders();
    @Query("select distinct p.frameShape from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.frameShape is not null and p.frameShape <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicFrameShapes();
    @Query("select distinct p.frameType from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.frameType is not null and p.frameType <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicFrameTypes();
    @Query("select distinct v.color from ProductVariant v where v.product.deletedAt is null " +
            "and v.product.status = 'PUBLISHED' and v.status = 'ACTIVE' and v.color is not null and v.color <> '' " +
            "and exists (select c.id from Category c where c member of v.product.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicColors();
    @Query("select distinct p.badge from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and p.badge is not null and p.badge <> '' and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
            "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null)")
    java.util.List<String> findPublicBadges();
    @Query("select distinct p from Product p where p.deletedAt is null and p.status = 'PUBLISHED' " +
            "and exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE') " +
    "and exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null) " +
            "and (:q is null or lower(p.name) like lower(concat('%', :q, '%')) " +
            "or lower(p.brand) like lower(concat('%', :q, '%')) " +
            "or lower(p.description) like lower(concat('%', :q, '%')) " +
            "or lower(coalesce(p.material, '')) like lower(concat('%', :q, '%')) " +
            "or lower(coalesce(p.gender, '')) like lower(concat('%', :q, '%')) " +
            "or lower(coalesce(p.frameShape, '')) like lower(concat('%', :q, '%')) " +
            "or lower(coalesce(p.frameType, '')) like lower(concat('%', :q, '%')) " +
            "or exists (select c.id from Category c where c member of p.categories and c.categoryType = 'CATALOG' " +
            "and c.status = 'ACTIVE' and c.deletedAt is null and lower(c.name) like lower(concat('%', :q, '%'))) " +
            "or exists (select v.id from ProductVariant v where v.product = p and v.status = 'ACTIVE' " +
            "and lower(coalesce(v.color, '')) like lower(concat('%', :q, '%')))) " +
            "and (:brand is null or lower(p.brand) = lower(:brand)) " +
            "and (:material is null or lower(p.material) = lower(:material)) " +
            "and (:gender is null or lower(p.gender) = lower(:gender)) " +
            "and (:frameShape is null or lower(p.frameShape) = lower(:frameShape)) " +
            "and (:frameType is null or lower(p.frameType) = lower(:frameType)) " +
            "and (:badge is null or lower(p.badge) = lower(:badge)) " +
            "and (:category is null or exists (select c.id from Category c where c member of p.categories " +
            "and c.categoryType = 'CATALOG' and c.status = 'ACTIVE' and c.deletedAt is null " +
            "and (lower(c.slug) = lower(:category) or lower(c.id) = lower(:category)))) " +
            "and (:color is null or exists (select v.id from ProductVariant v where v.product = p " +
            "and v.status = 'ACTIVE' and lower(v.color) = lower(:color))) " +
            "and (:availableOnly = false or (:franchiseId is null and exists (select v.id from ProductVariant v " +
            "where v.product = p and v.status = 'ACTIVE' and v.quantity > v.reservedQuantity)) " +
            "or (:franchiseId is not null and exists (select inventory.id from FranchiseInventory inventory " +
            "where inventory.store.id = :franchiseId and inventory.variant.product = p " +
            "and inventory.availabilityStatus = 'ACTIVE' and inventory.quantity > inventory.reservedQuantity))) " +
            "and (:franchiseId is null or exists (select store.id from Store store where store.id = :franchiseId " +
            "and store.franchiseManaged = true and store.status = 'ACTIVE')) " +
            "and (:minPrice is null or p.basePrice >= :minPrice) and (:maxPrice is null or p.basePrice <= :maxPrice)")
    Page<Product> searchWithFranchise(@Param("q") String q, @Param("brand") String brand, @Param("category") String category,
                         @Param("material") String material, @Param("gender") String gender,
                         @Param("frameShape") String frameShape, @Param("frameType") String frameType,
                         @Param("color") String color, @Param("badge") String badge, @Param("availableOnly") boolean availableOnly,
                         @Param("minPrice") java.math.BigDecimal minPrice, @Param("maxPrice") java.math.BigDecimal maxPrice,
                         @Param("franchiseId") String franchiseId,
                         Pageable pageable);

    default Page<Product> search(String q, String brand, String category, String material, String gender,
                                 String frameShape, String frameType, String color, String badge,
                                 boolean availableOnly, java.math.BigDecimal minPrice,
                                 java.math.BigDecimal maxPrice, Pageable pageable) {
        return searchWithFranchise(q, brand, category, material, gender, frameShape, frameType, color,
                badge, availableOnly, minPrice, maxPrice, null, pageable);
    }
}
