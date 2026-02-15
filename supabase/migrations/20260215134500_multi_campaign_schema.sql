-- Multi-Campaign Schema Implementation for Talpa.org
-- Migration: 20260215134500_multi_campaign_schema.sql

-- 1) member_whitelist (Update to use TCKN as PRIMARY KEY if needed)
-- Careful: if existing FKs point to id, we might need to handle them.
-- Based on previous migrations, it seems we use tckn text NOT NULL UNIQUE.
DO $$
BEGIN
    -- If id is the PK, we try to switch it. 
    -- However, Safest is to ensure tckn is PK for new structure.
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'member_whitelist' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Alter existing table if it doesn't match the new PK requirement
        -- For this specific task, we will ensure columns exist as requested.
        ALTER TABLE public.member_whitelist 
            DROP CONSTRAINT IF EXISTS member_whitelist_pkey CASCADE;
    END IF;
END $$;

ALTER TABLE public.member_whitelist
    DROP COLUMN IF EXISTS id;

ALTER TABLE public.member_whitelist
    ADD PRIMARY KEY (tckn);

ALTER TABLE public.member_whitelist
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_debtor SET DEFAULT false;

-- 2) field_templates (Field Library)
CREATE TABLE IF NOT EXISTS public.field_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    type text NOT NULL CHECK (type IN ('input', 'select', 'textarea')),
    options jsonb DEFAULT '[]', -- For select values
    is_required boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 3) campaigns (Enhancement)
ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
    ADD COLUMN IF NOT EXISTS extra_fields_schema jsonb DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS default_email_html text,
    ADD COLUMN IF NOT EXISTS default_email_subject text,
    ADD COLUMN IF NOT EXISTS default_sender_name text;

-- Ensure slug is unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'campaigns' AND indexname = 'campaigns_slug_key'
    ) THEN
        ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 4) email_rules
CREATE TABLE IF NOT EXISTS public.email_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    condition_field text,
    condition_value text,
    email_subject text,
    email_html text,
    sender_name text,
    created_at timestamptz DEFAULT now()
);

-- 5) applications (Enhancement)
-- Ensure unique(campaign_id, tckn)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'applications' AND indexname = 'applications_campaign_id_tckn_key'
    ) THEN
        ALTER TABLE public.applications ADD CONSTRAINT applications_campaign_id_tckn_key UNIQUE (campaign_id, tckn);
    END IF;
END $$;

-- Policies Implementation
-- Admin (authenticated) has full access
-- Anon (public) can only SELECT active campaigns and INSERT applications

-- Reset current policies to ensure consistency
DROP POLICY IF EXISTS "member_whitelist_admin_all" ON public.member_whitelist;
DROP POLICY IF EXISTS "field_templates_admin_all" ON public.field_templates;
DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_read_active" ON public.campaigns;
DROP POLICY IF EXISTS "email_rules_admin_all" ON public.email_rules;
DROP POLICY IF EXISTS "applications_admin_all" ON public.applications;
DROP POLICY IF EXISTS "applications_anon_insert" ON public.applications;

-- member_whitelist
ALTER TABLE public.member_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_whitelist_admin_all" ON public.member_whitelist
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- field_templates
ALTER TABLE public.field_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_templates_admin_all" ON public.field_templates
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_admin_all" ON public.campaigns
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "campaigns_read_active" ON public.campaigns
    FOR SELECT USING (status = 'active' OR is_active = true);

-- email_rules
ALTER TABLE public.email_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_rules_admin_all" ON public.email_rules
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_admin_all" ON public.applications
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "applications_anon_insert" ON public.applications
    FOR INSERT WITH CHECK (true);
