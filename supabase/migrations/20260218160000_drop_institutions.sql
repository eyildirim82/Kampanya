-- Kurumlar (institutions) tablosunu ve campaigns.institution_id referansını kaldır

-- 1. campaigns tablosundan FK ve sütunu kaldır
ALTER TABLE public.campaigns
    DROP CONSTRAINT IF EXISTS campaigns_institution_id_fkey;

DROP INDEX IF EXISTS public.idx_campaigns_institution;

ALTER TABLE public.campaigns
    DROP COLUMN IF EXISTS institution_id;

-- 2. institutions tablosundaki RLS policy'leri kaldır
DROP POLICY IF EXISTS "Public can view active institutions" ON public.institutions;
DROP POLICY IF EXISTS "Admins have full access to institutions" ON public.institutions;

-- 3. institutions tablosunu kaldır
DROP TABLE IF EXISTS public.institutions;
