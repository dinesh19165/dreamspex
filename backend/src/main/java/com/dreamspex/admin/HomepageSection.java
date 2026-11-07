package com.dreamspex.admin;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "homepage_sections")
public class HomepageSection {
    @Id
    @Column(length = 255)
    private String id = UUID.randomUUID().toString();
    @Column(nullable = false, unique = true, length = 120) private String slug;
    @Column(name = "section_type", nullable = false, length = 40) private String sectionType;
    @Column(length = 180) private String title;
    @Column(length = 500) private String subtitle;
    @Column(columnDefinition = "JSON") private String contentJson;
    @Column(name = "display_order", nullable = false) private int displayOrder;
    @Column(nullable = false, length = 16) private String status = "DRAFT";
    @Column(nullable = false) private boolean enabled = true;
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "homepage_section_products",
            joinColumns = @JoinColumn(name = "section_id", referencedColumnName = "id"),
            inverseJoinColumns = @JoinColumn(name = "product_id", referencedColumnName = "id"))
    private Set<Product> products = new LinkedHashSet<>();
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "homepage_section_categories",
            joinColumns = @JoinColumn(name = "section_id", referencedColumnName = "id"),
            inverseJoinColumns = @JoinColumn(name = "category_id", referencedColumnName = "id"))
    private Set<Category> categories = new LinkedHashSet<>();
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "updated_by") private User updatedBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    public String getId(){return id;} public String getSlug(){return slug;} public void setSlug(String v){slug=v;}
    public String getSectionType(){return sectionType;} public void setSectionType(String v){sectionType=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getSubtitle(){return subtitle;} public void setSubtitle(String v){subtitle=v;}
    public String getContentJson(){return contentJson;} public void setContentJson(String v){contentJson=v;}
    public int getDisplayOrder(){return displayOrder;} public void setDisplayOrder(int v){displayOrder=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public boolean isEnabled(){return enabled;} public void setEnabled(boolean v){enabled=v;}
    public Set<Product> getProducts(){return products;} public Set<Category> getCategories(){return categories;}
    public void setUpdatedBy(User v){updatedBy=v;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
