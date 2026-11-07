package com.dreamspex.order;

import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.auth.entity.User; import com.dreamspex.catalog.entity.ProductVariant; import com.dreamspex.prescription.Prescription; import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="order_items")
public class OrderItem {
 @Id private String id=UUID.randomUUID().toString(); @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="order_id",nullable=false) private Order order;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="variant_id",nullable=false) private ProductVariant variant;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="prescription_id") private Prescription prescription;
 @Column(name="selected_lens_codes",length=1000) private String selectedLensCodes;
 @Column(name="lens_additional_price",nullable=false,precision=12,scale=2) private BigDecimal lensAdditionalPrice=BigDecimal.ZERO;
 @Column(name="lens_preparation_days") private Integer lensPreparationDays;
 @Column(name="lens_preparation_status",nullable=false,length=32) private String lensPreparationStatus="PENDING";
 @Column(name="lens_preparation_notes",length=1000) private String lensPreparationNotes;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="lens_preparation_updated_by") private User lensPreparationUpdatedBy;
 @Column(name="lens_preparation_updated_at") private Instant lensPreparationUpdatedAt;
 @Column(name="product_name_snapshot",nullable=false) private String productNameSnapshot; @Column(name="sku_snapshot",nullable=false) private String skuSnapshot;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal unitPrice; @Column(nullable=false) private int quantity; @Column(name="line_total",nullable=false,precision=12,scale=2) private BigDecimal lineTotal;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 public String getId(){return id;} public Order getOrder(){return order;} public void setOrder(Order v){order=v;} public ProductVariant getVariant(){return variant;} public void setVariant(ProductVariant v){variant=v;}
 public Prescription getPrescription(){return prescription;} public void setPrescription(Prescription v){prescription=v;}
 public String getSelectedLensCodes(){return selectedLensCodes;} public void setSelectedLensCodes(String v){selectedLensCodes=v;}
 public BigDecimal getLensAdditionalPrice(){return lensAdditionalPrice;} public void setLensAdditionalPrice(BigDecimal v){lensAdditionalPrice=v;}
 public Integer getLensPreparationDays(){return lensPreparationDays;} public void setLensPreparationDays(Integer v){lensPreparationDays=v;}
 public String getLensPreparationStatus(){return lensPreparationStatus;} public void setLensPreparationStatus(String v){lensPreparationStatus=v;}
 public String getLensPreparationNotes(){return lensPreparationNotes;} public void setLensPreparationNotes(String v){lensPreparationNotes=v;}
 public User getLensPreparationUpdatedBy(){return lensPreparationUpdatedBy;} public void setLensPreparationUpdatedBy(User v){lensPreparationUpdatedBy=v;}
 public Instant getLensPreparationUpdatedAt(){return lensPreparationUpdatedAt;} public void setLensPreparationUpdatedAt(Instant v){lensPreparationUpdatedAt=v;}
 public String getProductNameSnapshot(){return productNameSnapshot;} public void setProductNameSnapshot(String v){productNameSnapshot=v;} public String getSkuSnapshot(){return skuSnapshot;} public void setSkuSnapshot(String v){skuSnapshot=v;}
 public BigDecimal getUnitPrice(){return unitPrice;} public void setUnitPrice(BigDecimal v){unitPrice=v;} public int getQuantity(){return quantity;} public void setQuantity(int v){quantity=v;} public BigDecimal getLineTotal(){return lineTotal;} public void setLineTotal(BigDecimal v){lineTotal=v;}
}
