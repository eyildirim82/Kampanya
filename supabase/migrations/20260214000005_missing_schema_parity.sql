-- Missing Schema Parity: interests, rate limit RPC, audit_logs
-- Aligns DB with app usage in admin/actions.ts and talep/actions.ts.

-- ---------------------------------------------------------------------------
-- 1) Interests table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tckn text NOT NULL,
  full_name text,
  email text,
  phone text,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interests_campaign_id ON public.interests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_interests_tckn ON public.interests(tckn);

COMMENT ON TABLE public.interests IS 'Talep formu ile gönderilen ön talepler; anon INSERT, admin SELECT/DELETE.';

-- ---------------------------------------------------------------------------
-- 2) Rate limit: backing table + RPC (3 requests per hour per TCKN/Action)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tckn text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_lookup
  ON public.rate_limit_entries(tckn, action, created_at DESC);

COMMENT ON TABLE public.rate_limit_entries IS 'check_rate_limit RPC için; aynı TCKN+action için saatte 3 deneme.';

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_tckn text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF p_tckn IS NULL OR p_tckn = '' OR p_action IS NULL OR p_action = '' THEN
    RETURN false;
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.rate_limit_entries
  WHERE tckn = p_tckn
    AND action = p_action
    AND created_at > (now() - interval '1 hour');

  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_entries (tckn, action)
  VALUES (p_tckn, p_action);

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, text) IS 'Aynı TCKN ve action için saatte en fazla 3 isteğe izin verir; yeni kayıt ekler ve limit aşılmadıysa true döner.';

-- ---------------------------------------------------------------------------
-- 3) Audit logs (admin actions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_identifier text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Admin işlemleri (export, bulk update vb.) için denetim kaydı.';

-- ---------------------------------------------------------------------------
-- 4) RLS: interests (anon INSERT, admin SELECT + DELETE)
-- ---------------------------------------------------------------------------
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- Anon: sadece INSERT (talep formu)
CREATE POLICY "interests_anon_insert" ON public.interests
  FOR INSERT WITH CHECK (true);

-- Admin: SELECT ve DELETE (panel)
CREATE POLICY "interests_admin_select" ON public.interests
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "interests_admin_delete" ON public.interests
  FOR DELETE USING (public.is_admin(auth.uid()));

-- audit_logs: sadece admin yazabilsin, okuyabilir (opsiyonel: sadece admin read)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_all" ON public.audit_logs
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- rate_limit_entries: sadece check_rate_limit RPC yazsın; anon/authenticated doğrudan erişemesin
REVOKE ALL ON public.rate_limit_entries FROM anon;
REVOKE ALL ON public.rate_limit_entries FROM authenticated;
