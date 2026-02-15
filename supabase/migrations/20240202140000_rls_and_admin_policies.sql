-- Migration: RLS Policies for Admin Access and Member Whitelist Management
-- This migration ensures proper RLS policies for admin operations

-- 1. Admin access to member_whitelist (INSERT, UPDATE, DELETE)
-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Admins full access to whitelist" ON member_whitelist;

CREATE POLICY "Admins full access to whitelist"
    ON member_whitelist FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- 2. Admin access to campaigns (ensure consistency)
-- Note: There might be duplicate policies from different migrations, but this ensures admin access
DROP POLICY IF EXISTS "Admins full access campaigns" ON campaigns;

CREATE POLICY "Admins full access campaigns"
    ON campaigns FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- 3. Admin access to audit_logs (read only for admins)
DROP POLICY IF EXISTS "Admins read audit logs" ON audit_logs;

CREATE POLICY "Admins read audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- 4. Ensure admins table has RLS enabled
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 5. Admin can read their own admin record
DROP POLICY IF EXISTS "Admins read own record" ON admins;

CREATE POLICY "Admins read own record"
    ON admins FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 6. Service role can manage admins (for admin creation scripts)
-- Note: This is typically handled via service_role key, but explicit policy helps
-- Service role bypasses RLS by default, but explicit policy is clearer

-- 7. Ensure applications table has proper admin policies
-- The policy from 20240202130000_security_updates.sql should exist, but ensure it's correct
DROP POLICY IF EXISTS "Admins read all applications" ON applications;

CREATE POLICY "Admins read all applications"
    ON applications FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

-- 8. Admin can update/delete applications
DROP POLICY IF EXISTS "Admins manage applications" ON applications;

CREATE POLICY "Admins manage applications"
    ON applications FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

CREATE POLICY "Admins delete applications"
    ON applications FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );
