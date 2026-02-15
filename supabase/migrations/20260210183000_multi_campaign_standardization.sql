-- Multi-campaign standardization and backfill
-- 1) Normalize campaigns schema (name + campaign_code)
-- 2) Guarantee at least one active default campaign
-- 3) Backfill applications.campaign_id for legacy rows

ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS campaign_code TEXT;

-- Fill missing names using older "title" column when present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'campaigns'
          AND column_name = 'title'
    ) THEN
        EXECUTE $sql$
            UPDATE public.campaigns
            SET name = COALESCE(NULLIF(name, ''), NULLIF(title, ''), 'Genel Başvuru')
            WHERE name IS NULL OR name = ''
        $sql$;
    ELSE
        UPDATE public.campaigns
        SET name = 'Genel Başvuru'
        WHERE name IS NULL OR name = '';
    END IF;
END $$;

-- Fill missing campaign codes.
UPDATE public.campaigns
SET campaign_code = UPPER(
    REGEXP_REPLACE(
        COALESCE(NULLIF(campaign_code, ''), NULLIF(name, ''), 'GENERAL'),
        '[^A-Za-z0-9]+',
        '_',
        'g'
    )
)
WHERE campaign_code IS NULL OR campaign_code = '';

-- De-duplicate campaign_code values by appending deterministic suffix.
WITH duplicates AS (
    SELECT
        id,
        campaign_code,
        ROW_NUMBER() OVER (PARTITION BY campaign_code ORDER BY created_at, id) AS rn
    FROM public.campaigns
)
UPDATE public.campaigns c
SET campaign_code = CONCAT(c.campaign_code, '_', SUBSTRING(REPLACE(c.id::TEXT, '-', '') FROM 1 FOR 6))
FROM duplicates d
WHERE c.id = d.id
  AND d.rn > 1;

-- Keep campaign_code unique across all campaigns.
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_campaign_code_unique_idx
ON public.campaigns (campaign_code);

-- Ensure there is always at least one active campaign.
INSERT INTO public.campaigns (name, campaign_code, is_active)
SELECT 'Genel Başvuru', 'GENERAL_DEFAULT', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.campaigns WHERE is_active = true
);

-- Backfill legacy applications without campaign_id.
WITH fallback_campaign AS (
    SELECT id
    FROM public.campaigns
    WHERE is_active = true
    ORDER BY created_at DESC, id
    LIMIT 1
)
UPDATE public.applications a
SET campaign_id = fc.id
FROM fallback_campaign fc
WHERE a.campaign_id IS NULL;
