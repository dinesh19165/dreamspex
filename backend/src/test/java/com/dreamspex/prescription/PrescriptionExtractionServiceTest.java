package com.dreamspex.prescription;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrescriptionExtractionServiceTest {
    private final PrescriptionExtractionService extraction = new PrescriptionExtractionService();

    @Test
    void extractsSignedEyeValuesPdAndDatesWithoutChangingZeroes() {
        var result = extraction.extract("""
                OD SPH -2.00 CYL -0.75 AXIS 90 ADD +1.25
                OS SPH +1.00 CYL 0.00 AXIS 0 ADD +1.25
                PD 63
                RX DATE: 2025-01-02
                EXPIRY DATE: 2026-01-02
                """, BigDecimal.valueOf(92));

        assertEquals(new BigDecimal("-2.00"), result.rightSph());
        assertEquals(new BigDecimal("-0.75"), result.rightCyl());
        assertEquals(90, result.rightAxis());
        assertEquals(new BigDecimal("1.00"), result.leftSph());
        assertEquals(new BigDecimal("0.00"), result.leftCyl());
        assertEquals(0, result.leftAxis());
        assertEquals(new BigDecimal("63"), result.pd());
        assertEquals("2025-01-02", result.prescriptionDate().toString());
        assertEquals("2026-01-02", result.expiryDate().toString());
        assertEquals("COMPLETED", result.status());
    }

    @Test
    void leavesMissingAndUncertainValuesBlank() {
        var result = extraction.extract("OD SPH -2.00 CYL -1.00 AXIS 220\nOS SPH +1.00", BigDecimal.valueOf(45));

        assertEquals(new BigDecimal("-2.00"), result.rightSph());
        assertNull(result.rightAxis());
        assertNull(result.leftCyl());
        assertNull(result.pd());
        assertEquals("LOW_CONFIDENCE", result.status());
    }

    @Test
    void extractsExplicitTotalPd() {
        var result = extraction.extract("PD: 62", null);

        assertEquals(new BigDecimal("62"), result.pd());
        assertNull(result.rightPd());
        assertNull(result.leftPd());
    }

    @Test
    void sumsRightAndLeftPdInsteadOfTreatingEitherAsTotal() {
        var result = extraction.extract("Right PD: 31 mm, Left PD: 31 mm", null);

        assertEquals(new BigDecimal("31"), result.rightPd());
        assertEquals(new BigDecimal("31"), result.leftPd());
        assertEquals(new BigDecimal("62"), result.pd());
    }

    @Test
    void extractsOdAndOsMonocularPd() {
        var result = extraction.extract("OD PD: 31, OS PD: 31", null);

        assertEquals(new BigDecimal("31"), result.rightPd());
        assertEquals(new BigDecimal("31"), result.leftPd());
        assertEquals(new BigDecimal("62"), result.pd());
    }

    @Test
    void extractsSlashSeparatedMonocularPd() {
        var result = extraction.extract("Monocular PD: 31/31", null);

        assertEquals(new BigDecimal("31"), result.rightPd());
        assertEquals(new BigDecimal("31"), result.leftPd());
        assertEquals(new BigDecimal("62"), result.pd());
    }

    @Test
    void flagsUnqualifiedMonocularSizedPdAsAmbiguous() {
        var result = extraction.extract("PD: 31", null);

        assertNull(result.pd());
        assertNull(result.rightPd());
        assertNull(result.leftPd());
        assertEquals("LOW_CONFIDENCE", result.status());
        assertTrue(result.missingFields().contains("pd"));
        assertTrue(result.missingFields().contains("patientName"));
    }

    @Test
    void doesNotInventMissingPd() {
        var result = extraction.extract("Prescription values follow.", null);

        assertNull(result.pd());
        assertNull(result.rightPd());
        assertNull(result.leftPd());
        assertEquals("LOW_CONFIDENCE", result.status());
    }

    @Test
    void extractsPatientNameAndSignedValuesFromPrescriptionRows() {
        var result = extraction.extract("""
                Patient Name: Avery Example
                OD -2.00 +0.75 90
                OS +1.25 -1.00 180
                PD: 62
                """, null);

        assertEquals("Avery Example", result.patientName());
        assertEquals(new BigDecimal("-2.00"), result.rightSph());
        assertEquals(new BigDecimal("0.75"), result.rightCyl());
        assertEquals(new BigDecimal("1.25"), result.leftSph());
        assertEquals(new BigDecimal("-1.00"), result.leftCyl());
    }

    @Test
    void extractsLabeledPrescriptionWithRightAndLeftAliases() {
        var result = extraction.extract("""
                Patient: Morgan Example
                Right Eye: Sphere -2.25 Cylinder +0.75 Axis 85 ADD +1.50
                Left Eye: SPH +1.00 CYL -0.50 Axis 95 ADD +1.50
                Prescription Date: 2025-03-10
                Expiry Date: 2026-03-10
                Total PD: 64
                """, null);

        assertEquals("Morgan Example", result.patientName());
        assertEquals(new BigDecimal("-2.25"), result.rightSph());
        assertEquals(new BigDecimal("0.75"), result.rightCyl());
        assertEquals(85, result.rightAxis());
        assertEquals(new BigDecimal("1.50"), result.rightAdd());
        assertEquals(new BigDecimal("1.00"), result.leftSph());
        assertEquals(new BigDecimal("-0.50"), result.leftCyl());
        assertEquals(95, result.leftAxis());
        assertEquals(new BigDecimal("1.50"), result.leftAdd());
        assertEquals("2025-03-10", result.prescriptionDate().toString());
        assertEquals("2026-03-10", result.expiryDate().toString());
    }

    @Test
    void extractsColumnarPrescriptionLayoutWithFieldRows() {
        var result = extraction.extract("""
                Patient Name: Taylor Example
                OD       OS
                SPH     -2.00   +1.25
                CYL     -0.75   +0.50
                AXIS       90      45
                ADD      +1.00   +1.25
                PD: 62
                """, null);

        assertEquals(new BigDecimal("-2.00"), result.rightSph());
        assertEquals(new BigDecimal("-0.75"), result.rightCyl());
        assertEquals(90, result.rightAxis());
        assertEquals(new BigDecimal("1.00"), result.rightAdd());
        assertEquals(new BigDecimal("1.25"), result.leftSph());
        assertEquals(new BigDecimal("0.50"), result.leftCyl());
        assertEquals(45, result.leftAxis());
        assertEquals(new BigDecimal("1.25"), result.leftAdd());
    }

    @Test
    void extractsOcrConfusedSignedValuesAndDoesNotInventMissingFields() {
        var result = extraction.extract("""
                R: SPH -O.75 CYL +O.5O AXIS 9O
                L: SPHERE +1.25 CYL -O.25 AXIS 18O
                PD: 62
                """, null);

        assertEquals(new BigDecimal("-0.75"), result.rightSph());
        assertEquals(new BigDecimal("0.50"), result.rightCyl());
        assertEquals(90, result.rightAxis());
        assertEquals(new BigDecimal("1.25"), result.leftSph());
        assertEquals(new BigDecimal("-0.25"), result.leftCyl());
        assertEquals(180, result.leftAxis());
        assertNull(result.rightAdd());
        assertNull(result.leftAdd());
    }

    @Test
    void leavesPartiallyPresentPrescriptionValuesBlank() {
        var result = extraction.extract("""
                OD: SPH -2.00
                OS: SPH +1.00
                PD: 62
                """, null);

        assertNull(result.rightCyl());
        assertNull(result.rightAxis());
        assertNull(result.leftCyl());
        assertNull(result.leftAxis());
    }
}
