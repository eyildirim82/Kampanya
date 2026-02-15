-- RPC: Kampanya bazlı başvuru istatistikleri (dashboard için). DB tarafında aggregate eder.
CREATE OR REPLACE FUNCTION get_campaign_stats()
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  total bigint,
  approved bigint,
  rejected bigint,
  pending bigint,
  conversion_rate text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.campaign_code AS code,
    COUNT(a.id) AS total,
    COUNT(a.id) FILTER (WHERE a.status = 'APPROVED') AS approved,
    COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') AS rejected,
    COUNT(a.id) FILTER (WHERE a.status IN ('PENDING', 'REVIEWING')) AS pending,
    CASE
      WHEN COUNT(a.id) > 0 THEN ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'APPROVED') / COUNT(a.id), 1)::text
      ELSE '0.0'
    END AS conversion_rate
  FROM campaigns c
  LEFT JOIN applications a ON a.campaign_id = c.id
  GROUP BY c.id, c.name, c.campaign_code
  ORDER BY total DESC;
$$;

COMMENT ON FUNCTION get_campaign_stats() IS 'Dashboard kampanya istatistikleri; admin tarafından çağrılır.';
