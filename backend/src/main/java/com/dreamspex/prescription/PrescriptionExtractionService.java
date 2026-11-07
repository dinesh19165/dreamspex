package com.dreamspex.prescription;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.dreamspex.prescription.PrescriptionDtos.*;

public class PrescriptionExtractionService {
    private static final String NUMBER = "([+-]?\\d{1,3}(?:\\.\\d{1,2})?)(?![\\d.])";
    private static final Pattern EYE_LABEL = Pattern.compile("(?i)(?<![A-Z])(?<eye>OD|OS|RIGHT(?:\\s+EYE)?|LEFT(?:\\s+EYE)?|R|L)(?![A-Z])\\s*[:=]?\\s*");
    private static final Pattern OCR_NUMBER = Pattern.compile("(?<![A-Z0-9])([+\\-]?(?=[0-9OQIL|]*[0-9OQ])[0-9OQIL|]+(?:\\.[0-9OQIL|]+)?)(?![A-Z0-9])");
    private static final Pattern FIELD_ROW = Pattern.compile("(?i)^\\s*(SPH|SPHERE|CYL|CYLINDER|AXIS|ADD|ADDITION)\\s*[:=]?\\s*(.*)$");
    private static final Pattern PATIENT_NAME = Pattern.compile("(?im)^\\s*(?:PATIENT\\s+NAME|PATIENT|NAME)\\s*[:=]\\s*(.{2,160}?)\\s*$");

    public PrescriptionExtraction extract(String text, BigDecimal inputConfidence) {
        String normalized = normalizeOcrNumbers(text == null ? "" : text.replace('\u00a0', ' ').replace('\u2212', '-').toUpperCase(Locale.ROOT));
        BigDecimal confidence = inputConfidence == null ? null : inputConfidence.max(BigDecimal.ZERO).min(BigDecimal.valueOf(100));
        EyeValues[] eyeSections = eyeSections(normalized);
        EyeValues[] tableValues = tableValues(normalized);
        EyeValues right = fillMissing(tableValues[0], eyeSections[0]);
        EyeValues left = fillMissing(tableValues[1], eyeSections[1]);
        BigDecimal rightSph = right.sph();
        BigDecimal rightCyl = right.cyl();
        Integer rightAxis = right.axis();
        BigDecimal rightAdd = right.add();
        BigDecimal leftSph = left.sph();
        BigDecimal leftCyl = left.cyl();
        Integer leftAxis = left.axis();
        BigDecimal leftAdd = left.add();

        BigDecimal rightPd = labelled(normalized, "(?:RIGHT|OD|R)\\s*(?:EYE\\s*)?PD|PD\\s*(?:RIGHT|OD|R)");
        BigDecimal leftPd = labelled(normalized, "(?:LEFT|OS|L)\\s*(?:EYE\\s*)?PD|PD\\s*(?:LEFT|OS|L)");
        Matcher monocularPd = Pattern.compile("(?i)MONOCULAR\\s+PD\\s*[:=]?\\s*" + NUMBER + "\\s*[/,]\\s*" + NUMBER).matcher(normalized);
        if (monocularPd.find() && (rightPd == null || leftPd == null)) {
            if (rightPd == null) rightPd = decimal(monocularPd.group(1));
            if (leftPd == null) leftPd = decimal(monocularPd.group(2));
        }
        BigDecimal pd = rightPd != null && leftPd != null
                ? rightPd.add(leftPd)
                : explicitTotalPd(normalized);
        LocalDate prescriptionDate = date(normalized, "PRESCRIPTION\\s+DATE|RX\\s+DATE|DATE");
        LocalDate expiryDate = date(normalized, "EXPIR(?:Y|ATION)\\s+DATE|VALID\\s+UNTIL");
        Matcher patient = PATIENT_NAME.matcher(text == null ? "" : text);
        String patientName = patient.find() ? patient.group(1).trim() : null;

        List<String> missing = new ArrayList<>();
        if (rightSph == null) missing.add("rightSph");
        if (rightCyl == null) missing.add("rightCyl");
        if (rightAxis == null && rightCyl != null && rightCyl.compareTo(BigDecimal.ZERO) != 0) missing.add("rightAxis");
        if (leftSph == null) missing.add("leftSph");
        if (leftCyl == null) missing.add("leftCyl");
        if (leftAxis == null && leftCyl != null && leftCyl.compareTo(BigDecimal.ZERO) != 0) missing.add("leftAxis");
        if (pd == null) missing.add("pd");
        boolean incompleteRequiredFields = !missing.isEmpty();
        if (patientName == null) missing.add("patientName");
        String status = confidence != null && confidence.compareTo(BigDecimal.valueOf(70)) < 0 || incompleteRequiredFields
                ? "LOW_CONFIDENCE" : "COMPLETED";
        return new PrescriptionExtraction(patientName, rightSph, rightCyl, rightAxis, rightAdd,
                leftSph, leftCyl, leftAxis, leftAdd, pd, rightPd, leftPd,
                prescriptionDate, expiryDate, confidence, status, missing);
    }

    private EyeValues[] eyeSections(String text) {
        EyeValues right = EyeValues.empty();
        EyeValues left = EyeValues.empty();
        Matcher matcher = EYE_LABEL.matcher(text);
        List<EyeMarker> markers = new ArrayList<>();
        while (matcher.find()) {
            String label = matcher.group("eye").replaceAll("\\s+EYE$", "");
            boolean isRight = label.equals("OD") || label.equals("R") || label.equals("RIGHT");
            markers.add(new EyeMarker(matcher.start(), matcher.end(), isRight));
        }
        for (int index = 0; index < markers.size(); index++) {
            EyeMarker marker = markers.get(index);
            int end = index + 1 < markers.size() ? markers.get(index + 1).start() : text.length();
            EyeValues parsed = parseEye(text.substring(marker.end(), end));
            if (marker.right()) right = fillMissing(right, parsed);
            else left = fillMissing(left, parsed);
        }
        return new EyeValues[]{right, left};
    }

    private EyeValues[] tableValues(String text) {
        boolean rightFirst = true;
        boolean foundHeader = false;
        for (String line : text.split("\\R")) {
            List<EyeMarker> markers = eyeMarkers(line);
            if (markers.stream().anyMatch(EyeMarker::right) && markers.stream().anyMatch(marker -> !marker.right())) {
                rightFirst = markers.get(0).right();
                foundHeader = true;
                break;
            }
        }
        if (!foundHeader) return new EyeValues[]{EyeValues.empty(), EyeValues.empty()};

        EyeValues right = EyeValues.empty();
        EyeValues left = EyeValues.empty();
        for (String line : text.split("\\R")) {
            Matcher field = FIELD_ROW.matcher(line);
            if (!field.matches()) continue;
            List<BigDecimal> values = numbers(field.group(2));
            if (values.size() < 2) continue;
            EyeValues first = valueForField(EyeValues.empty(), field.group(1), values.get(0));
            EyeValues second = valueForField(EyeValues.empty(), field.group(1), values.get(1));
            if (rightFirst) {
                right = fillMissing(right, first);
                left = fillMissing(left, second);
            } else {
                left = fillMissing(left, first);
                right = fillMissing(right, second);
            }
        }
        return new EyeValues[]{right, left};
    }

    private List<EyeMarker> eyeMarkers(String line) {
        List<EyeMarker> markers = new ArrayList<>();
        Matcher matcher = EYE_LABEL.matcher(line);
        while (matcher.find()) {
            String label = matcher.group("eye").replaceAll("\\s+EYE$", "");
            markers.add(new EyeMarker(matcher.start(), matcher.end(),
                    label.equals("OD") || label.equals("R") || label.equals("RIGHT")));
        }
        return markers;
    }

    private EyeValues parseEye(String text) {
        BigDecimal sph = labelled(text, "SPH|SPHERE");
        BigDecimal cyl = labelled(text, "CYL|CYLINDER");
        BigDecimal axisValue = labelled(text, "AXIS");
        BigDecimal add = labelled(text, "ADD|ADDITION");
        Integer axis = axisValue == null ? null : validAxis(axisValue);
        if (!Pattern.compile("(?i)\\b(?:SPH|SPHERE|CYL|CYLINDER|AXIS|ADD|ADDITION)\\b").matcher(text).find()) {
            BigDecimal[] values = positional(text);
            if (sph == null && values.length > 0) sph = values[0];
            if (cyl == null && values.length > 1) cyl = values[1];
            if (axis == null && values.length > 2) axis = validAxis(values[2]);
            if (add == null && values.length > 3) add = values[3];
        }
        return new EyeValues(sph, cyl, axis, add);
    }

    private EyeValues valueForField(EyeValues values, String field, BigDecimal value) {
        return switch (field.toUpperCase(Locale.ROOT)) {
            case "SPH", "SPHERE" -> new EyeValues(value, values.cyl(), values.axis(), values.add());
            case "CYL", "CYLINDER" -> new EyeValues(values.sph(), value, values.axis(), values.add());
            case "AXIS" -> new EyeValues(values.sph(), values.cyl(), validAxis(value), values.add());
            case "ADD", "ADDITION" -> new EyeValues(values.sph(), values.cyl(), values.axis(), value);
            default -> values;
        };
    }

    private EyeValues fillMissing(EyeValues primary, EyeValues fallback) {
        return new EyeValues(
                primary.sph() == null ? fallback.sph() : primary.sph(),
                primary.cyl() == null ? fallback.cyl() : primary.cyl(),
                primary.axis() == null ? fallback.axis() : primary.axis(),
                primary.add() == null ? fallback.add() : primary.add());
    }

    private String normalizeOcrNumbers(String text) {
        Matcher matcher = OCR_NUMBER.matcher(text);
        StringBuffer normalized = new StringBuffer();
        while (matcher.find()) {
            String number = matcher.group(1).replace('O', '0').replace('Q', '0')
                    .replace('I', '1').replace('L', '1').replace('|', '1');
            matcher.appendReplacement(normalized, Matcher.quoteReplacement(number));
        }
        matcher.appendTail(normalized);
        return normalized.toString();
    }

    private BigDecimal explicitTotalPd(String text) {
        Matcher matcher = Pattern.compile("(?im)^\\s*(?:TOTAL\\s+)?(?:PUPILLARY\\s+DISTANCE|PD)\\s*[:=]?\\s*" + NUMBER).matcher(text);
        if (!matcher.find()) return null;
        BigDecimal value = decimal(matcher.group(1));
        return value != null && value.compareTo(BigDecimal.valueOf(40)) > 0 ? value : null;
    }

    private BigDecimal labelled(String text, String labels) {
        Matcher matcher = Pattern.compile("(?i)(?:^|[^A-Z])(?:" + labels + ")\\s*[:=]?\\s*" + NUMBER).matcher(text);
        return matcher.find() ? decimal(matcher.group(1)) : null;
    }

    private Integer axis(String text) {
        BigDecimal value = labelled(text, "AXIS");
        return value == null ? null : validAxis(value);
    }

    private Integer validAxis(BigDecimal value) {
        try {
            int axis = value.intValueExact();
            return axis >= 0 && axis <= 180 ? axis : null;
        } catch (ArithmeticException exception) {
            return null;
        }
    }

    private BigDecimal[] positional(String line) {
        if (line.isBlank()) return new BigDecimal[0];
        String withoutLabels = line.replaceAll("(?i)SPH(?:ERE)?|CYL(?:INDER)?|AXIS|ADD(?:ITION)?", " ");
        Matcher matcher = Pattern.compile("[+-]?\\d{1,3}(?:\\.\\d{1,2})?(?![\\d.])").matcher(withoutLabels);
        List<BigDecimal> values = new ArrayList<>();
        while (matcher.find() && values.size() < 4) values.add(decimal(matcher.group()));
        return values.toArray(BigDecimal[]::new);
    }

    private List<BigDecimal> numbers(String text) {
        Matcher matcher = Pattern.compile("[+-]?\\d{1,3}(?:\\.\\d{1,2})?(?![\\d.])").matcher(text);
        List<BigDecimal> values = new ArrayList<>();
        while (matcher.find()) values.add(decimal(matcher.group()));
        return values;
    }

    private BigDecimal decimal(String value) {
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private LocalDate date(String text, String labels) {
        Matcher matcher = Pattern.compile("(?i)(?:" + labels + ")\\s*[:=]?\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})").matcher(text);
        if (!matcher.find()) return null;
        String value = matcher.group(1);
        try {
            if (value.matches("\\d{4}-\\d{2}-\\d{2}")) return LocalDate.parse(value);
            String[] formats = {"d/M/yyyy", "M/d/yyyy", "d-M-yyyy", "M-d-yyyy", "d/M/yy", "M/d/yy"};
            for (String format : formats) {
                try {
                    return LocalDate.parse(value, DateTimeFormatter.ofPattern(format));
                } catch (DateTimeParseException ignored) {
                    // Try another unambiguous supported numeric date format.
                }
            }
        } catch (DateTimeParseException ignored) {
            return null;
        }
        return null;
    }

    public record PrescriptionExtraction(String patientName, BigDecimal rightSph, BigDecimal rightCyl, Integer rightAxis, BigDecimal rightAdd,
                                         BigDecimal leftSph, BigDecimal leftCyl, Integer leftAxis, BigDecimal leftAdd,
                                         BigDecimal pd, BigDecimal rightPd, BigDecimal leftPd,
                                         LocalDate prescriptionDate, LocalDate expiryDate, BigDecimal confidence,
                                         String status, List<String> missingFields) {}

    private record EyeMarker(int start, int end, boolean right) {}
    private record EyeValues(BigDecimal sph, BigDecimal cyl, Integer axis, BigDecimal add) {
        private static EyeValues empty() {
            return new EyeValues(null, null, null, null);
        }
    }
}
