-- Migration: Update Schema and Roles
-- 1. Update member_whitelist: Remove tckn_hash, add tckn, update verify_member
-- 2. Update applications: Add dynamic_data, remove tckn_hash
-- 3. Update admins: Add role column
-- 4. Update decrypt_tckn: Restrict viewer role

-- 1. Update member_whitelist
ALTER TABLE member_whitelist ADD COLUMN IF NOT EXISTS tckn TEXT;
-- Ensure uniqueness
ALTER TABLE member_whitelist ADD CONSTRAINT member_whitelist_tckn_key UNIQUE (tckn);

-- Drop tckn_hash (Data will be lost in this column)
ALTER TABLE member_whitelist DROP COLUMN IF EXISTS tckn_hash;

-- Update verify_member function to use tckn instead of hash
DROP FUNCTION IF EXISTS verify_member(text);

CREATE OR REPLACE FUNCTION verify_member(p_tckn TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM member_whitelist 
        WHERE tckn = p_tckn 
        AND is_active = true
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update applications (conceptually campaign_submissions)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS dynamic_data JSONB DEFAULT '{}';

-- Remove tckn_hash from applications
DROP INDEX IF EXISTS idx_applications_tckn_hash;
ALTER TABLE applications DROP COLUMN IF EXISTS tckn_hash;

-- 3. Update admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'viewer'));

-- 4. Update decrypt_tckn to restrict viewer role
CREATE OR REPLACE FUNCTION decrypt_tckn(p_encrypted_tckn TEXT, p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_decrypted TEXT;
    v_admin_id UUID;
    v_role TEXT;
BEGIN
    -- Check if user is authenticated
    IF auth.role() <> 'service_role' AND auth.role() <> 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get Current User ID
    v_admin_id := auth.uid();

    -- Service role bypass
    IF auth.role() = 'service_role' THEN
         -- Proceed
    ELSE
        -- Check if user is in admins table
        SELECT role INTO v_role FROM admins WHERE id = v_admin_id;
        
        IF v_role IS NULL THEN
             RAISE EXCEPTION 'Access Denied: Admin privileges required.';
        END IF;

        IF v_role = 'viewer' THEN
             RAISE EXCEPTION 'Access Denied: Viewer role cannot decrypt sensitive data.';
        END IF;
    END IF;

    -- Decrypt
    BEGIN
        v_decrypted := pgp_sym_decrypt(decode(p_encrypted_tckn, 'hex'), p_key);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL; -- Handle bad key or data
    END;

    -- Log to Audit Logs
    INSERT INTO audit_logs (admin_id, action, target_identifier, details)
    VALUES (
        v_admin_id, 
        'DECRYPT_TCKN', 
        NULL, 
        jsonb_build_object('success', (v_decrypted IS NOT NULL))
    );

    RETURN v_decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
