-- RPC: TCKN + telefon ile başvuru durumu sorgulama (sadece status, kampanya adı, tarih döner; PII kısıtlı).
-- Uygulama (sorgula action) bu RPC'yi SERVICE_ROLE ile çağırır; tabloya doğrudan select yapılmaz.
CREATE OR REPLACE FUNCTION get_application_status_by_tckn_phone(p_tckn text, p_phone text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  status text,
  campaign_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.created_at,
    a.status,
    COALESCE(c.name, 'Genel Başvuru') AS campaign_name
  FROM applications a
  LEFT JOIN campaigns c ON c.id = a.campaign_id
  WHERE a.tckn = p_tckn
    AND a.phone = p_phone
  ORDER BY a.created_at DESC;
$$;

COMMENT ON FUNCTION get_application_status_by_tckn_phone(text, text) IS
  'TCKN ve telefon ile eşleşen başvuruların sadece durum bilgisini döndürür. Service role ile çağrılmalıdır.';
