-- ==============================================
-- ADU-03: Add Branding Colors to Institutions
-- Renk ve tema ayarlarını kurum bazlı yapıyoruz
-- ==============================================

-- 1. Add color columns
ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#00558d', -- TALPA Blue 500
    ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#002855'; -- TALPA Navy 600

-- 2. Add comments
COMMENT ON COLUMN public.institutions.primary_color IS 'Example: Button backgrounds, primary highlights (#E30613 for DenizBank)';
COMMENT ON COLUMN public.institutions.secondary_color IS 'Example: Headers, dark backgrounds (#002855 for TALPA)';

-- 3. Update DenizBank colors (if exists)
UPDATE public.institutions
SET 
    primary_color = '#E30613', -- DenizBank Red
    secondary_color = '#002855' -- Keep Navy for standard text/headers or use custom
WHERE code = 'DENIZBANK';
