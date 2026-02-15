-- Initial schema: campaigns, applications, member_whitelist + RPCs used by later migrations.
-- Bu migration diğer tüm migration'lardan önce çalışır.

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  title text,
  campaign_code text,
  slug text,
  description text,
  institution_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  max_quota bigint,
  status text DEFAULT 'draft',
  is_active boolean DEFAULT false,
  form_schema jsonb DEFAULT '[]',
  page_content jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- applications
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tckn text NOT NULL,
  phone text,
  full_name text,
  email text,
  status text DEFAULT 'PENDING',
  form_data jsonb DEFAULT '{}',
  client_ip text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, tckn)
);

CREATE INDEX IF NOT EXISTS idx_applications_campaign_id ON public.applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_tckn_phone ON public.applications(tckn, phone);

-- member_whitelist (TALPA üye listesi)
CREATE TABLE IF NOT EXISTS public.member_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tckn text NOT NULL UNIQUE,
  masked_name text,
  is_active boolean DEFAULT true,
  is_debtor boolean DEFAULT false,
  synced_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_whitelist_tckn ON public.member_whitelist(tckn);

-- Eski tabloda is_debtor yoksa ekle (IF NOT EXISTS ile güvenli)
ALTER TABLE public.member_whitelist ADD COLUMN IF NOT EXISTS is_debtor boolean DEFAULT false;

-- RPC: verify_member (basvuru/kredi/talep akışında whitelist kontrolü)
DROP FUNCTION IF EXISTS public.verify_member(text);
CREATE OR REPLACE FUNCTION public.verify_member(p_tckn_plain text)
RETURNS TABLE (id uuid, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.id,
    CASE
      WHEN m.is_debtor THEN 'DEBTOR'::text
      WHEN COALESCE(m.is_active, true) THEN 'ACTIVE'::text
      ELSE 'INACTIVE'::text
    END
  FROM member_whitelist m
  WHERE m.tckn = p_tckn_plain
  LIMIT 1;
  -- If no row: empty result. App treats empty as NOT_FOUND.
$$;

COMMENT ON FUNCTION public.verify_member(text) IS 'Whitelist üyelik kontrolü; DEBTOR/ACTIVE/INACTIVE veya boş (NOT_FOUND).';

-- RPC: check_existing_application (mükerrer başvuru kontrolü)
DROP FUNCTION IF EXISTS public.check_existing_application(text, uuid, uuid);
CREATE OR REPLACE FUNCTION public.check_existing_application(
  p_tckn_plain text,
  p_campaign_id uuid,
  p_member_id uuid
)
RETURNS TABLE ("exists" boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM applications a
    WHERE a.campaign_id = p_campaign_id AND a.tckn = p_tckn_plain
  ) AS "exists";
$$;

COMMENT ON FUNCTION public.check_existing_application(text, uuid, uuid) IS 'Aynı kampanya için aynı TCKN ile başvuru var mı.';

-- RLS (opsiyonel: public okuma için anon açık bırakılabilir; production'da sıkılaştırın)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_whitelist ENABLE ROW LEVEL SECURITY;

-- Anon: campaigns sadece is_active=true olanları okuyabilsin
CREATE POLICY "campaigns_read_active" ON public.campaigns FOR SELECT USING (is_active = true);

-- Anon: applications tablosuna doğrudan erişim yok (RPC ile)
CREATE POLICY "applications_no_anon" ON public.applications FOR SELECT USING (false);

-- Anon: member_whitelist doğrudan okunmasın (verify_member RPC kullanılsın)
CREATE POLICY "member_whitelist_no_anon" ON public.member_whitelist FOR SELECT USING (false);
