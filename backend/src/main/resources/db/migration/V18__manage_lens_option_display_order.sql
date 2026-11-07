ALTER TABLE lens_options
    ADD COLUMN display_order INT NOT NULL DEFAULT 0;

UPDATE lens_options
SET display_order = CASE code
    WHEN 'SINGLE_VISION' THEN 10
    WHEN 'BIFOCAL' THEN 20
    WHEN 'PROGRESSIVE' THEN 30
    WHEN 'ANTI_REFLECTIVE' THEN 10
    WHEN 'BLUE_LIGHT' THEN 20
    WHEN 'PHOTOCHROMIC' THEN 30
    WHEN 'UV_PROTECTION' THEN 40
    WHEN 'STANDARD' THEN 10
    WHEN 'HIGH_INDEX' THEN 20
    ELSE display_order
END;

INSERT INTO lens_options (
    id, code, name, category, benefits, additional_cost, preparation_days, available,
    display_order, created_at, updated_at
)
SELECT UUID(), 'STANDARD', 'Standard', 'MATERIAL',
       'Everyday optical lens material for standard prescriptions.', 0.00, NULL, TRUE,
       10, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM lens_options WHERE code = 'STANDARD');
