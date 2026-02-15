-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Member whitelist table (hashed TCKNs only)
CREATE TABLE member_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tckn_hash TEXT UNIQUE NOT NULL,
    masked_name TEXT,
    is_active BOOLEAN DEFAULT true,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table (synced from Odoo)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    odoo_id INTEGER UNIQUE,
    campaign_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign submissions table
CREATE TABLE campaign_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    tckn_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    form_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, tckn_hash) -- Prevent duplicate submissions
);

-- Sync logs for monitoring
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type TEXT NOT NULL CHECK (sync_type IN ('members', 'campaigns')),
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    records_processed INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_whitelist_tckn ON member_whitelist(tckn_hash);
CREATE INDEX idx_whitelist_active ON member_whitelist(is_active) WHERE is_active = true;
CREATE INDEX idx_campaigns_code ON campaigns(campaign_code);
CREATE INDEX idx_campaigns_active ON campaigns(is_active) WHERE is_active = true;
CREATE INDEX idx_submissions_campaign ON campaign_submissions(campaign_id);
CREATE INDEX idx_submissions_created ON campaign_submissions(created_at DESC);
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at DESC);

-- RLS Policies
ALTER TABLE member_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for verification
CREATE POLICY "Allow public TCKN verification" 
    ON member_whitelist FOR SELECT 
    USING (is_active = true);

-- Public read access for active campaigns
CREATE POLICY "Allow public campaign view" 
    ON campaigns FOR SELECT 
    USING (is_active = true AND end_date >= CURRENT_DATE);

-- Public insert for submissions
CREATE POLICY "Allow public submissions" 
    ON campaign_submissions FOR INSERT 
    WITH CHECK (true);

-- Public read own submissions (via RPC function)
CREATE POLICY "Allow read own submissions" 
    ON campaign_submissions FOR SELECT 
    USING (true);

-- Admin-only access to logs (requires authentication)
CREATE POLICY "Admin access to sync logs" 
    ON sync_logs FOR ALL 
    USING (auth.role() = 'authenticated');

-- Helper function to get active campaigns
CREATE OR REPLACE FUNCTION get_active_campaigns()
RETURNS TABLE (
    id UUID,
    campaign_code TEXT,
    name TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.campaign_code,
        c.name,
        c.description,
        c.start_date,
        c.end_date
    FROM campaigns c
    WHERE c.is_active = true
    AND c.end_date >= CURRENT_DATE
    ORDER BY c.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify membership and prevent rate limiting
CREATE OR REPLACE FUNCTION verify_member(p_tckn_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM member_whitelist 
        WHERE tckn_hash = p_tckn_hash 
        AND is_active = true
    ) INTO v_exists;
    
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON member_whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo campaigns
INSERT INTO campaigns (odoo_id, campaign_code, name, description, start_date, end_date, is_active) VALUES
(1, 'PRIVATE_CARD', 'Private Card Kampanyası', 'DenizBank Private Kart avantajları', '2024-06-01', '2024-08-31', true),
(2, 'NEWYEAR_2025', 'Yılbaşı Özel Kampanyası', 'Yılbaşına özel avantajlar', '2024-12-15', '2025-01-15', true),
(3, 'SPRING_2025', 'İlkbahar Fırsatları', 'İlkbahar dönemine özel kampanya', '2025-03-01', '2025-05-31', true);
