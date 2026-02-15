-- Migration: OTP System and Member Linking

-- 1. Create otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tckn TEXT NOT NULL, -- Storing TCKN temporarily for verification context
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanups
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_otp_tckn ON otp_codes(tckn);

-- 2. Add member_id to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES member_whitelist(id);

-- 3. Add unique constraint to prevent duplicates per campaign/member
-- Check if exists first to avoid error? Easier to just add if not exists implies complex PL/pgSQL usually, but we'll try straight ADD
ALTER TABLE applications ADD CONSTRAINT applications_campaign_member_unique UNIQUE (campaign_id, member_id);

-- 4. Enable RLS on otp_codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role only initially? Or public insert via function?
-- Let functions handle it.
