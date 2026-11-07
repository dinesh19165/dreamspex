package com.dreamspex.order;

import com.dreamspex.prescription.Prescription;
import com.dreamspex.order.OrderDtos.SelectedLensOption;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class PrescriptionSummaryPdf {
    private PrescriptionSummaryPdf() {}

    static byte[] generate(String orderNumber, Prescription prescription, List<SelectedLensOption> lenses,
                           BigDecimal lensAdditionalPrice, Integer preparationDays) {
        List<String> lines = new ArrayList<>();
        lines.add("Dream Spex - Prescription Summary");
        lines.add("Order: " + orderNumber);
        lines.add("Patient: " + value(prescription.getPatientName()));
        lines.add("Prescription source: " + value(prescription.getSource()));
        lines.add("Prescription date: " + value(prescription.getPrescriptionDate()));
        lines.add("Expiry date: " + value(prescription.getExpiryDate()));
        lines.add("");
        lines.add("Right Eye (OD)");
        lines.add("SPH: " + value(prescription.getRightSph()) + "    CYL: " + value(prescription.getRightCyl())
                + "    AXIS: " + value(prescription.getRightAxis()) + "    ADD: " + value(prescription.getRightAdd()));
        lines.add("Left Eye (OS)");
        lines.add("SPH: " + value(prescription.getLeftSph()) + "    CYL: " + value(prescription.getLeftCyl())
                + "    AXIS: " + value(prescription.getLeftAxis()) + "    ADD: " + value(prescription.getLeftAdd()));
        lines.add("Total PD: " + value(prescription.getPd()) + " mm");
        lines.add("Monocular PD - Right: " + value(prescription.getRightPd()) + " mm"
                + "    Left: " + value(prescription.getLeftPd()) + " mm");
        lines.add("");
        lines.add("Selected lenses");
        if (lenses.isEmpty()) {
            lines.add("No lens options recorded");
        } else {
            lenses.forEach(lens -> lines.add(value(lens.category()) + ": " + lens.name()));
        }
        lines.add("Lens additional price: INR " + value(lensAdditionalPrice));
        lines.add("Estimated preparation time: " + (preparationDays == null ? "Not specified" : preparationDays + " days"));
        return createPdf(wrapLines(lines));
    }

    private static List<String> wrapLines(List<String> lines) {
        List<String> result = new ArrayList<>();
        for (String line : lines) {
            for (int start = 0; start < line.length(); start += 85) {
                result.add(line.substring(start, Math.min(start + 85, line.length())));
            }
            if (line.isEmpty()) result.add("");
        }
        return result;
    }

    private static byte[] createPdf(List<String> lines) {
        StringBuilder content = new StringBuilder("BT\n/F1 11 Tf\n50 790 Td\n");
        for (String line : lines) {
            content.append('(').append(escape(line)).append(") Tj\n0 -18 Td\n");
        }
        content.append("ET\n");
        byte[] stream = content.toString().getBytes(StandardCharsets.US_ASCII);
        List<byte[]> objects = List.of(
                bytes("<< /Type /Catalog /Pages 2 0 R >>"),
                bytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
                bytes("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"),
                bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
                concat(bytes("<< /Length " + stream.length + " >>\nstream\n"), stream, bytes("endstream"))
        );
        ByteArrayOutputStream pdf = new ByteArrayOutputStream();
        write(pdf, "%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objects.size(); i++) {
            offsets.add(pdf.size());
            write(pdf, (i + 1) + " 0 obj\n");
            pdf.writeBytes(objects.get(i));
            write(pdf, "\nendobj\n");
        }
        int xrefOffset = pdf.size();
        write(pdf, "xref\n0 " + (objects.size() + 1) + "\n0000000000 65535 f \n");
        for (int offset : offsets) {
            write(pdf, String.format("%010d 00000 n \n", offset));
        }
        write(pdf, "trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\nstartxref\n"
                + xrefOffset + "\n%%EOF\n");
        return pdf.toByteArray();
    }

    private static String value(Object value) {
        return value == null ? "Not recorded" : value.toString();
    }

    private static String escape(String text) {
        String ascii = text.replaceAll("[^\\x20-\\x7E]", "?");
        return ascii.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private static byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.US_ASCII);
    }

    private static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        for (byte[] part : parts) result.writeBytes(part);
        return result.toByteArray();
    }

    private static void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(bytes(value));
    }
}
