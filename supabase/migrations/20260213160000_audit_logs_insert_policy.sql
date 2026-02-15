-- ==============================================
-- ADU-10: Allow Admins to Insert Audit Logs
-- Required for logging export actions from Server Actions
-- ==============================================

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins insert audit logs" ON audit_logs;

CREATE POLICY "Admins insert audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );
