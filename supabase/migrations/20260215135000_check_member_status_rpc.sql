-- check_member_status RPC for OTP auth flow (auth/check, auth/verify).
-- Returns member_exists, member_email, has_app for the given TCKN.
-- member_whitelist may not have email; we add it if missing and fallback to applications.email.

-- Ensure member_whitelist has email for OTP (optional; fallback from applications in RPC)
ALTER TABLE public.member_whitelist
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.member_whitelist.email IS 'Üye e-posta (OTP gönderimi için); yoksa applications tablosundan son başvuru e-postası kullanılır.';

CREATE OR REPLACE FUNCTION public.check_member_status(input_tckn text)
RETURNS TABLE (member_exists boolean, member_email text, has_app boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_tckn text := NULLIF(trim(input_tckn), '');
  v_member_exists boolean := false;
  v_member_email text := NULL;
  v_has_app boolean := false;
BEGIN
  IF v_tckn IS NULL OR length(v_tckn) <> 11 THEN
    RETURN QUERY SELECT false, NULL::text, false;
    RETURN;
  END IF;

  -- Check whitelist and get email (from whitelist or latest application)
  SELECT true INTO v_member_exists
  FROM public.member_whitelist m
  WHERE m.tckn = v_tckn
  LIMIT 1;

  IF v_member_exists THEN
    SELECT COALESCE(
      (SELECT mw.email FROM public.member_whitelist mw WHERE mw.tckn = v_tckn LIMIT 1),
      (SELECT a.email FROM public.applications a WHERE a.tckn = v_tckn AND a.email IS NOT NULL AND a.email <> '' ORDER BY a.created_at DESC LIMIT 1)
    ) INTO v_member_email;

    SELECT EXISTS(
      SELECT 1 FROM public.applications a WHERE a.tckn = v_tckn LIMIT 1
    ) INTO v_has_app;
  END IF;

  RETURN QUERY SELECT v_member_exists, v_member_email, v_has_app;
END;
$$;

COMMENT ON FUNCTION public.check_member_status(text) IS 'OTP akışı için üye durumu: member_exists, member_email (whitelist veya son başvuru), has_app.';
