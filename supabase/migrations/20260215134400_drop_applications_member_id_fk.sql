-- Drop applications.member_id FK and column so member_whitelist can switch PK from id to tckn (20260215134500).
-- submit_dynamic_application_secure no longer uses member_id; identity is by tckn.

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_campaign_member_unique;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_member_id_fkey;

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS member_id;

COMMENT ON TABLE public.applications IS 'Başvurular campaign_id + tckn ile tanımlanır; member_id kaldırıldı (member_whitelist PK tckn).';
