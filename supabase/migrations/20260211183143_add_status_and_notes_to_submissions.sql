-- Create Enum Type for Status (Idempotent)
DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVIEWING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to applications (formerly campaign_submissions in dev plan)
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS status public.application_status DEFAULT 'PENDING'::public.application_status,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- Ensure existing rows have 'PENDING'
UPDATE public.applications SET status = 'PENDING' WHERE status IS NULL;
