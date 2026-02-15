-- ==============================================
-- ADU-02: Enhance Campaigns Table
-- status enum, institution_id FK, max_quota
-- ==============================================

-- 1. Create campaign_status enum
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns
ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id),
    ADD COLUMN IF NOT EXISTS status campaign_status DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS max_quota INTEGER;

-- 3. Migrate existing data: is_active = true → status 'active', false → 'closed'
UPDATE public.campaigns SET status = 'active' WHERE is_active = true AND status IS NULL;
UPDATE public.campaigns SET status = 'closed' WHERE is_active = false AND status IS NULL;

-- 4. Link all existing campaigns to DenizBank
UPDATE public.campaigns
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'DENIZBANK' LIMIT 1)
WHERE institution_id IS NULL;

-- 5. Trigger to keep is_active in sync with status
CREATE OR REPLACE FUNCTION sync_campaign_is_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_campaign_is_active ON public.campaigns;
CREATE TRIGGER trg_sync_campaign_is_active
    BEFORE INSERT OR UPDATE OF status ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION sync_campaign_is_active();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_institution ON public.campaigns(institution_id);

-- 7. Comments
COMMENT ON COLUMN public.campaigns.status IS 'Campaign lifecycle: draft → active → paused/closed';
COMMENT ON COLUMN public.campaigns.institution_id IS 'FK to institutions table';
COMMENT ON COLUMN public.campaigns.max_quota IS 'Max applications allowed (NULL = unlimited)';
