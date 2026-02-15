-- Add trigger_event column to email_configurations table
-- This column determines when the email should be sent (e.g. SUBMISSION, STATUS_APPROVED, STATUS_REJECTED)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_configurations' AND column_name = 'trigger_event') THEN
        ALTER TABLE public.email_configurations ADD COLUMN trigger_event TEXT NOT NULL DEFAULT 'SUBMISSION';
    END IF;
END $$;

-- Update the comment
COMMENT ON COLUMN public.email_configurations.trigger_event IS 'Event that triggers this email: SUBMISSION, STATUS_APPROVED, STATUS_REJECTED';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_configs_trigger ON public.email_configurations(trigger_event);
