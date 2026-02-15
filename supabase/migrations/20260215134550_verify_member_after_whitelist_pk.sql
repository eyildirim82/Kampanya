-- After member_whitelist PK is tckn (id dropped), verify_member must return tckn instead of id.
-- check_existing_application: p_member_id made optional (unused in query).

DROP FUNCTION IF EXISTS public.verify_member(text);
CREATE OR REPLACE FUNCTION public.verify_member(p_tckn_plain text)
RETURNS TABLE (tckn text, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.tckn,
    CASE
      WHEN m.is_debtor THEN 'DEBTOR'::text
      WHEN COALESCE(m.is_active, true) THEN 'ACTIVE'::text
      ELSE 'INACTIVE'::text
    END
  FROM member_whitelist m
  WHERE m.tckn = p_tckn_plain
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.verify_member(text) IS 'Whitelist üyelik kontrolü; DEBTOR/ACTIVE/INACTIVE veya boş (NOT_FOUND). PK artık tckn.';

DROP FUNCTION IF EXISTS public.check_existing_application(text, uuid, uuid);
CREATE OR REPLACE FUNCTION public.check_existing_application(
  p_tckn_plain text,
  p_campaign_id uuid,
  p_member_id uuid DEFAULT NULL
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

COMMENT ON FUNCTION public.check_existing_application(text, uuid, uuid) IS 'Aynı kampanya için aynı TCKN ile başvuru var mı. p_member_id kullanılmıyor (geri uyumluluk için varsayılan NULL).';
