package com.dreamspex.prescription;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.order.Order;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "prescriptions")
public class Prescription {
    @Id private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "patient_name", nullable = false) private String patientName;
    @Column(name = "prescription_date") private LocalDate prescriptionDate;
    @Column(name = "right_sph") private BigDecimal rightSph;
    @Column(name = "right_cyl") private BigDecimal rightCyl;
    @Column(name = "right_axis") private Integer rightAxis;
    @Column(name = "right_add") private BigDecimal rightAdd;
    @Column(name = "left_sph") private BigDecimal leftSph;
    @Column(name = "left_cyl") private BigDecimal leftCyl;
    @Column(name = "left_axis") private Integer leftAxis;
    @Column(name = "left_add") private BigDecimal leftAdd;
    private BigDecimal pd;
    @Column(name = "right_pd") private BigDecimal rightPd;
    @Column(name = "left_pd") private BigDecimal leftPd;
    @Column(name = "expiry_date") private LocalDate expiryDate;
    @Column(nullable = false) private String source = "MANUAL";
    @Column(name = "extraction_status", nullable = false) private String extractionStatus = "NOT_RUN";
    @Column(name = "extraction_confidence", precision = 5, scale = 2) private BigDecimal extractionConfidence;
    @Column(name = "customer_confirmed", nullable = false) private boolean customerConfirmed;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id") private Product product;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @Column(name = "selected_lens_codes", columnDefinition = "TEXT") private String selectedLensCodes;
    @Column(nullable = false) private String status = "DRAFT";
    @Column(name = "review_note") private String reviewNote;
    @Column(name = "reviewed_by") private String reviewedBy;
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public String getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;}
    public String getPatientName(){return patientName;} public void setPatientName(String v){patientName=v;}
    public LocalDate getPrescriptionDate(){return prescriptionDate;} public void setPrescriptionDate(LocalDate v){prescriptionDate=v;}
    public BigDecimal getRightSph(){return rightSph;} public void setRightSph(BigDecimal v){rightSph=v;}
    public BigDecimal getRightCyl(){return rightCyl;} public void setRightCyl(BigDecimal v){rightCyl=v;}
    public Integer getRightAxis(){return rightAxis;} public void setRightAxis(Integer v){rightAxis=v;}
    public BigDecimal getRightAdd(){return rightAdd;} public void setRightAdd(BigDecimal v){rightAdd=v;}
    public BigDecimal getLeftSph(){return leftSph;} public void setLeftSph(BigDecimal v){leftSph=v;}
    public BigDecimal getLeftCyl(){return leftCyl;} public void setLeftCyl(BigDecimal v){leftCyl=v;}
    public Integer getLeftAxis(){return leftAxis;} public void setLeftAxis(Integer v){leftAxis=v;}
    public BigDecimal getLeftAdd(){return leftAdd;} public void setLeftAdd(BigDecimal v){leftAdd=v;}
    public BigDecimal getPd(){return pd;} public void setPd(BigDecimal v){pd=v;}
    public BigDecimal getRightPd(){return rightPd;} public void setRightPd(BigDecimal v){rightPd=v;}
    public BigDecimal getLeftPd(){return leftPd;} public void setLeftPd(BigDecimal v){leftPd=v;}
    public LocalDate getExpiryDate(){return expiryDate;} public void setExpiryDate(LocalDate v){expiryDate=v;}
    public String getSource(){return source;} public void setSource(String v){source=v;}
    public String getExtractionStatus(){return extractionStatus;} public void setExtractionStatus(String v){extractionStatus=v;}
    public BigDecimal getExtractionConfidence(){return extractionConfidence;} public void setExtractionConfidence(BigDecimal v){extractionConfidence=v;}
    public boolean isCustomerConfirmed(){return customerConfirmed;} public void setCustomerConfirmed(boolean v){customerConfirmed=v;}
    public Product getProduct(){return product;} public void setProduct(Product v){product=v;}
    public Order getOrder(){return order;} public void setOrder(Order v){order=v;}
    public String getSelectedLensCodes(){return selectedLensCodes;} public void setSelectedLensCodes(String v){selectedLensCodes=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getReviewNote(){return reviewNote;} public void setReviewNote(String v){reviewNote=v;}
    public String getReviewedBy(){return reviewedBy;} public void setReviewedBy(String v){reviewedBy=v;}
    public Instant getReviewedAt(){return reviewedAt;} public void setReviewedAt(Instant v){reviewedAt=v;}
}
