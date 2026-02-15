-- Create Agreement Status Enum
DO $$ BEGIN
    CREATE TYPE agreement_status_enum AS ENUM ('active', 'inactive', 'pending', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Agreements Table
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    type TEXT,
    status agreement_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- Create Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agreements_updated_at ON agreements;
CREATE TRIGGER update_agreements_updated_at
    BEFORE UPDATE ON agreements
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- RLS Policies

-- 1. Admins Read All
DROP POLICY IF EXISTS "Admins read all agreements" ON agreements;
CREATE POLICY "Admins read all agreements"
    ON agreements FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'admin'
    );

-- 2. Admins Insert/Update/Delete (Full Maintenance)
DROP POLICY IF EXISTS "Admins manage agreements" ON agreements;
CREATE POLICY "Admins manage agreements"
    ON agreements FOR ALL
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'admin'
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()) OR
        (auth.jwt() ->> 'role') = 'admin'
    );

-- RPC: Get Active Agreements
CREATE OR REPLACE FUNCTION get_active_agreements()
RETURNS SETOF agreements
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM agreements
    WHERE status = 'active'
    ORDER BY name ASC;
END;
$$;
