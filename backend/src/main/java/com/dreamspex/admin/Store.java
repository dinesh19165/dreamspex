package com.dreamspex.admin;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stores")
public class Store {
    @Id private String id = UUID.randomUUID().toString();
    @Column(nullable = false) private String name;
    private String phone;
    @Column(nullable = false) private String address;
    @Column(nullable = false) private String city;
    @Column(nullable = false) private String state;
    @Column(name = "postal_code", nullable = false) private String postalCode;
    @Column(precision = 10, scale = 7) private BigDecimal latitude;
    @Column(precision = 10, scale = 7) private BigDecimal longitude;
    @Column(name = "delivery_radius_km", precision = 8, scale = 2) private BigDecimal deliveryRadiusKm;
    @Column(nullable = false) private String status = "ACTIVE";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = value; }
    public String getAddress() { return address; }
    public void setAddress(String value) { address = value; }
    public String getCity() { return city; }
    public void setCity(String value) { city = value; }
    public String getState() { return state; }
    public void setState(String value) { state = value; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String value) { postalCode = value; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal value) { latitude = value; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal value) { longitude = value; }
    public BigDecimal getDeliveryRadiusKm() { return deliveryRadiusKm; }
    public void setDeliveryRadiusKm(BigDecimal value) { deliveryRadiusKm = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
}
