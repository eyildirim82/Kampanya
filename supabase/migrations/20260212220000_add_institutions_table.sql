-- ==============================================
-- ADU-01: Institutions Table
-- Kurumları (banka, sigorta vb.) yöneten tablo
-- ==============================================

-- 1. Create institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add comment
COMMENT ON TABLE public.institutions IS 'Kampanya yapılan kurumlar (DenizBank, vb.)';

-- 3. Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 4. Public read policy (active institutions only)
CREATE POLICY "Public can view active institutions"
    ON public.institutions
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 5. Admin full access policy
CREATE POLICY "Admins have full access to institutions"
    ON public.institutions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    );

-- 6. Index on code
CREATE INDEX IF NOT EXISTS idx_institutions_code ON public.institutions(code);

-- 7. Index on active status
CREATE INDEX IF NOT EXISTS idx_institutions_active ON public.institutions(is_active) WHERE is_active = true;

-- 8. Seed data: DenizBank
INSERT INTO public.institutions (name, code, contact_email)
VALUES ('DenizBank', 'DENIZBANK', NULL)
ON CONFLICT (code) DO NOTHING;
