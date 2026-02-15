-- Admin RLS & Access Policies
-- Adds is_admin() helper and admin policies for applications, member_whitelist, campaigns.
-- Does NOT modify or drop existing anon policies (e.g. campaigns_read_active).

-- 1) Admin helper: true if user_id exists in public.admins; null-safe (anon => false)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.admins WHERE id = user_id LIMIT 1);
END;
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS 'RLS helper: true if user is in admins table; null-safe for anon.';

-- 2) Applications: admins can select all and update (e.g. status)
CREATE POLICY "applications_admin_select" ON public.applications
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "applications_admin_update" ON public.applications
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3) Member whitelist: admins can manage (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "member_whitelist_admin_all" ON public.member_whitelist
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4) Campaigns: admins can manage all; existing campaigns_read_active (anon) unchanged
CREATE POLICY "campaigns_admin_all" ON public.campaigns
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
