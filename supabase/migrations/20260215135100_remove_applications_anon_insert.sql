-- Remove anon direct INSERT on applications. Inserts go only via submit_dynamic_application_secure (SECURITY DEFINER).
-- Prevents bypass of whitelist, quota and duplicate checks.

DROP POLICY IF EXISTS "applications_anon_insert" ON public.applications;

COMMENT ON TABLE public.applications IS 'Başvurular yalnızca submit_dynamic_application_secure RPC ile eklenir; anon doğrudan INSERT yapamaz.';
