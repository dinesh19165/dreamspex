package com.dreamspex.shopping.entity;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.prescription.Prescription;
import jakarta.persistence.*;
import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="cart_items",uniqueConstraints=@UniqueConstraint(name="uk_cart_items_variant",columnNames={"cart_id","variant_id"}))
public class CartItem {
 @Id private String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="cart_id",nullable=false) private Cart cart;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="variant_id",nullable=false) private ProductVariant variant;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="prescription_id") private Prescription prescription;
 @Column(name="selected_lens_codes",length=1000) private String selectedLensCodes;
 @Column(name="lens_additional_price",nullable=false,precision=12,scale=2) private BigDecimal lensAdditionalPrice=BigDecimal.ZERO;
 @Column(nullable=false) private int quantity;
 @Column(name="unit_price_snapshot",nullable=false,precision=12,scale=2) private BigDecimal unitPriceSnapshot;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public Cart getCart(){return cart;} public void setCart(Cart v){cart=v;} public ProductVariant getVariant(){return variant;} public void setVariant(ProductVariant v){variant=v;}
 public Prescription getPrescription(){return prescription;} public void setPrescription(Prescription v){prescription=v;}
 public String getSelectedLensCodes(){return selectedLensCodes;} public void setSelectedLensCodes(String v){selectedLensCodes=v;}
 public BigDecimal getLensAdditionalPrice(){return lensAdditionalPrice;} public void setLensAdditionalPrice(BigDecimal v){lensAdditionalPrice=v;}
 public int getQuantity(){return quantity;} public void setQuantity(int v){quantity=v;} public BigDecimal getUnitPriceSnapshot(){return unitPriceSnapshot;} public void setUnitPriceSnapshot(BigDecimal v){unitPriceSnapshot=v;}
}
