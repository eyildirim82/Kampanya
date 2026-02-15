-- Enable pgcrypto extension for encryption/hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. Create Admins Table (Prerequisite for RLS)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_identifier TEXT, -- can be TCKN hash or other ID
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Clean up legacy table if exists (from 001)
DROP TABLE IF EXISTS campaign_submissions CASCADE;

-- 3. Create Applications Table (Full Definition)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id), -- Assuming campaigns table exists from 001
    encrypted_tckn TEXT NOT NULL,
    tckn_hash TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    district TEXT,
    kvkk_consent BOOLEAN DEFAULT false,
    open_consent BOOLEAN DEFAULT false,
    communication_consent BOOLEAN DEFAULT false,
    consent_metadata JSONB DEFAULT '{}',
    form_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_tckn_hash ON applications(tckn_hash);
CREATE INDEX IF NOT EXISTS idx_applications_campaign ON applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);

-- Add tckn_hash column to whitelist if missing
ALTER TABLE member_whitelist ADD COLUMN IF NOT EXISTS tckn_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_whitelist_tckn_hash ON member_whitelist(tckn_hash);

-- RLS Policies for Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Public insert (for form submission)
CREATE POLICY "Allow public submissions" 
    ON applications FOR INSERT 
    WITH CHECK (true);

-- Admins read all
CREATE POLICY "Admins read all applications" 
    ON applications FOR SELECT 
    USING (
         auth.role() = 'service_role' OR
         EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()) OR
         (auth.jwt() ->> 'role') = 'admin' -- Fallback checks
    );

-- 4. TCKN Hashing Function
CREATE OR REPLACE FUNCTION generate_tckn_hash(p_tckn TEXT, p_salt TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(p_tckn || p_salt, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;


-- 5. Secure Decrypt Function
CREATE OR REPLACE FUNCTION decrypt_tckn(p_encrypted_tckn TEXT, p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_decrypted TEXT;
    v_admin_id UUID;
BEGIN
    -- Check if user is authenticated
    IF auth.role() <> 'service_role' AND auth.role() <> 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get Current User ID
    v_admin_id := auth.uid();

    -- Check if user is in admins table (Simple Role Check)
    IF NOT EXISTS (SELECT 1 FROM admins WHERE id = v_admin_id) AND auth.role() <> 'service_role' THEN
         RAISE EXCEPTION 'Access Denied: Admin privileges required.';
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

-- 6. Helper to Encrypt (for initial save)
CREATE OR REPLACE FUNCTION encrypt_tckn(p_tckn TEXT, p_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(p_tckn, p_key), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
