CREATE TYPE email_recipient_type AS ENUM ('applicant', 'admin', 'custom');

CREATE TABLE IF NOT EXISTS email_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_type email_recipient_type NOT NULL,
    recipient_email TEXT, -- Used if type is 'custom' or as fallback
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email configs" 
ON email_configurations 
FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
);
