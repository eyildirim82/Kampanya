-- Migration: Fix Security (Session/RLS) but KEEP Plaintext TCKN (Revert Hashing)
-- 1. Ensure member_whitelist uses 'tckn'
-- 2. Add Unique Constraint for Applications to prevent duplicates
-- 3. RLS Policies update
-- 4. Create Webhook for Email

-- Enable pgcrypto for hashing if not enabled (Still useful for other things)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure member_whitelist has tckn and proper constraints
-- Removing any previous hash columns if they exists (cleanup)
ALTER TABLE member_whitelist DROP COLUMN IF EXISTS tckn_hash;
-- Ensure tckn is present
ALTER TABLE member_whitelist ADD COLUMN IF NOT EXISTS tckn TEXT;
-- Constraint
ALTER TABLE member_whitelist DROP CONSTRAINT IF EXISTS member_whitelist_tckn_hash_key;
ALTER TABLE member_whitelist DROP CONSTRAINT IF EXISTS member_whitelist_tckn_key;
ALTER TABLE member_whitelist ADD CONSTRAINT member_whitelist_tckn_key UNIQUE (tckn);


-- Update verify_member function to use plaintext TCKN
DROP FUNCTION IF EXISTS verify_member(text);

CREATE OR REPLACE FUNCTION verify_member(p_tckn_plain TEXT)
RETURNS TABLE(id UUID, status TEXT) AS $$
DECLARE
    v_member_id UUID;
BEGIN
    SELECT m.id INTO v_member_id
    FROM member_whitelist m
    WHERE m.tckn = p_tckn_plain 
    AND m.is_active = true;
    
    IF v_member_id IS NOT NULL THEN
        RETURN QUERY SELECT v_member_id, 'FOUND';
    ELSE
        RETURN QUERY SELECT NULL::UUID, 'NOT_FOUND';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Constraints & Validation for Applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tckn TEXT;
-- Dropping hash column if it was added
ALTER TABLE applications DROP COLUMN IF EXISTS tckn_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_campaign_tckn_unique 
ON applications (campaign_id, tckn);

-- RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert" ON applications;
DROP POLICY IF EXISTS "Allow public submissions" ON applications;


-- 3. Webhook Trigger Function (for Email)
CREATE OR REPLACE FUNCTION notify_application_submitted()
RETURNS TRIGGER AS $$
BEGIN
    -- Database Webhook trigger placeholder
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update Secure RPC (Uses Plain TCKN now)
CREATE OR REPLACE FUNCTION submit_application_secure(
    p_tckn_plain TEXT,
    p_campaign_id UUID,
    p_encrypted_tckn TEXT,
    p_form_data JSONB,
    p_consent_metadata JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_member_id UUID;
    v_existing_id UUID;
    v_app_id UUID;
BEGIN
    -- 1. Verify Member exists in Whitelist (Plain)
    SELECT id INTO v_member_id FROM member_whitelist WHERE tckn = p_tckn_plain AND is_active = true;
    
    IF v_member_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Üye bulunamadı (Whitelist check failed).');
    END IF;

    -- 2. Check Duplicate Application
    SELECT id INTO v_existing_id 
    FROM applications 
    WHERE campaign_id = p_campaign_id AND tckn = p_tckn_plain;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bu kampanya için zaten başvurunuz bulunmaktadır.');
    END IF;

    -- 3. Insert Application
    INSERT INTO applications (
        campaign_id,
        member_id,
        tckn,
        encrypted_tckn,
        full_name,
        email,
        phone,
        address,
        city,
        district,
        kvkk_consent,
        open_consent,
        communication_consent,
        dynamic_data,
        consent_metadata
    ) VALUES (
        p_campaign_id,
        v_member_id,
        p_tckn_plain,
        p_encrypted_tckn,
        p_form_data->>'fullName',
        p_form_data->>'email',
        p_form_data->>'phone',
        p_form_data->>'address',
        p_form_data->>'city',
        p_form_data->>'district',
        (p_form_data->>'kvkkConsent')::boolean,
        (p_form_data->>'openConsent')::boolean,
        (p_form_data->>'communicationConsent')::boolean,
        p_form_data - 'fullName' - 'email' - 'phone' - 'address' - 'city' - 'district' - 'kvkkConsent' - 'openConsent' - 'communicationConsent',
        p_consent_metadata
    ) RETURNING id INTO v_app_id;

    RETURN jsonb_build_object('success', true, 'application_id', v_app_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
