-- Migration: Add interests table and RLS policies
-- Description: Creates the interests table for gathering user demands/interests for campaigns without full application commitment.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
    tckn TEXT, -- Nullable, as the user might not be a member yet or just visiting
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_interests_campaign ON public.interests(campaign_id);
-- Unique constraint to prevent duplicate interest submissions for the same campaign with the same email
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interests_campaign_email_key') THEN
    ALTER TABLE public.interests ADD CONSTRAINT interests_campaign_email_key UNIQUE (campaign_id, email);
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Public can insert interests" ON public.interests;
DROP POLICY IF EXISTS "Admins can view interests" ON public.interests;
DROP POLICY IF EXISTS "Admins can delete interests" ON public.interests;

-- Allow public to insert (anyone can submit an interest form)
CREATE POLICY "Public can insert interests"
    ON public.interests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow admins to view all interests
CREATE POLICY "Admins can view interests"
    ON public.interests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE admins.id = auth.uid()
        )
    );

-- Allow admins to delete interests
CREATE POLICY "Admins can delete interests"
    ON public.interests
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE admins.id = auth.uid()
        )
    );

-- 5. Create Trigger for Email Notification
-- We create a specific function for interests to ensure correct payload formatting

CREATE OR REPLACE FUNCTION notify_interest_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_function_url TEXT;
    v_payload JSONB;
    v_service_role_key TEXT;
BEGIN
    -- Resolve Edge Function URL (reusing logic from notify_application_submitted)
    BEGIN
        v_function_url := current_setting('app.settings.edge_function_url', true);
    EXCEPTION WHEN OTHERS THEN v_function_url := NULL; END;
    
    IF v_function_url IS NULL OR v_function_url = '' THEN
        BEGIN
            v_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-email';
        EXCEPTION WHEN OTHERS THEN v_function_url := NULL; END;
        
        IF v_function_url IS NULL OR v_function_url = '' OR v_function_url = '/functions/v1/process-email' THEN
            v_function_url := 'http://127.0.0.1:54321/functions/v1/process-email';
        END IF;
    END IF;

    -- Get Service Role Key
    BEGIN
        v_service_role_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN v_service_role_key := NULL; END;

    -- Build Payload
    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'interests',
        'record', jsonb_build_object(
            'id', NEW.id,
            'email', NEW.email,
            'full_name', NEW.full_name,
            'campaign_id', NEW.campaign_id,
            'tckn', NEW.tckn,
            'phone', NEW.phone,
            'note', NEW.note,
            'created_at', NEW.created_at
        ),
        'schema', 'public',
        'old_record', NULL
    );

    -- Send Webhook via pg_net
    PERFORM net.http_post(
        url := v_function_url,
        headers := CASE 
            WHEN v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
                jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_service_role_key
                )
            ELSE
                jsonb_build_object('Content-Type', 'application/json')
        END,
        body := v_payload::text
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger interest webhook: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS on_interest_submitted ON public.interests;
CREATE TRIGGER on_interest_submitted
    AFTER INSERT ON public.interests
    FOR EACH ROW
    EXECUTE FUNCTION notify_interest_submitted();
