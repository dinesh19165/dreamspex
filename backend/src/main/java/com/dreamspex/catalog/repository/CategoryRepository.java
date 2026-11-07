package com.dreamspex.catalog.repository;


import com.dreamspex.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, String> {
    List<Category> findByCategoryTypeAndStatusAndDeletedAtIsNullOrderBySortOrderAscNameAsc(String categoryType, String status);
    Optional<Category> findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull(String slug, String categoryType, String status);
    Optional<Category> findBySlugAndStatusAndDeletedAtIsNull(String slug, String status);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, String id);
    boolean existsByNameIgnoreCaseAndCategoryTypeAndDeletedAtIsNullAndIdNot(String name, String categoryType, String id);
    List<Category> findByCategoryTypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(String categoryType);
}
