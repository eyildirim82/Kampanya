-- Migration: Ensure Webhook Trigger is Properly Configured
-- This migration ensures the trigger function is correctly implemented
-- and pg_net extension is enabled for HTTP requests

-- 1. Enable pg_net extension (required for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Drop and recreate the trigger function with proper implementation
CREATE OR REPLACE FUNCTION notify_application_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_function_url TEXT;
    v_payload JSONB;
    v_service_role_key TEXT;
    v_log_url TEXT := 'http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4';
    v_log_payload JSONB;
BEGIN
    -- Log trigger execution start
    BEGIN
        v_log_payload := jsonb_build_object(
            'location', 'notify_application_submitted:trigger_start',
            'message', 'Trigger fired',
            'data', jsonb_build_object(
                'application_id', NEW.id,
                'email', NEW.email,
                'has_email', (NEW.email IS NOT NULL AND NEW.email != '')
            ),
            'timestamp', extract(epoch from now()) * 1000,
            'sessionId', 'debug-session',
            'runId', 'run1',
            'hypothesisId', 'A'
        );
        PERFORM net.http_post(
            url := v_log_url,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := v_log_payload::text
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log to PostgreSQL logs if HTTP fails
            RAISE WARNING 'Failed to send trigger log: %', SQLERRM;
    END;
    
    -- Try to get Edge Function URL from settings table or use default
    BEGIN
        v_function_url := current_setting('app.settings.edge_function_url', true);
    EXCEPTION
        WHEN OTHERS THEN
            v_function_url := NULL;
    END;
    
    -- If not set, try to get from SUPABASE_URL environment variable pattern
    IF v_function_url IS NULL OR v_function_url = '' THEN
        BEGIN
            v_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-email';
        EXCEPTION
            WHEN OTHERS THEN
                v_function_url := NULL;
        END;
        
        -- If still not set, use local development default
        IF v_function_url IS NULL OR v_function_url = '' OR v_function_url = '/functions/v1/process-email' THEN
            -- Default to local development URL
            v_function_url := 'http://127.0.0.1:54321/functions/v1/process-email';
        END IF;
    END IF;
    
    -- Log URL being used
    BEGIN
        v_log_payload := jsonb_build_object(
            'location', 'notify_application_submitted:url_resolved',
            'message', 'Function URL resolved',
            'data', jsonb_build_object('function_url', v_function_url),
            'timestamp', extract(epoch from now()) * 1000,
            'sessionId', 'debug-session',
            'runId', 'run1',
            'hypothesisId', 'B'
        );
        PERFORM net.http_post(
            url := v_log_url,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := v_log_payload::text
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to send URL log: %', SQLERRM;
    END;
    
    -- Get service role key if available (for authorization)
    BEGIN
        v_service_role_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION
        WHEN OTHERS THEN
            v_service_role_key := NULL;
    END;
    
    -- Build webhook payload matching what Edge Function expects
    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'applications',
        'record', jsonb_build_object(
            'id', NEW.id,
            'email', NEW.email,
            'full_name', NEW.full_name,
            'campaign_id', NEW.campaign_id,
            'created_at', NEW.created_at
        ),
        'schema', 'public',
        'old_record', NULL
    );
    
    -- Log before sending webhook
    BEGIN
        v_log_payload := jsonb_build_object(
            'location', 'notify_application_submitted:before_webhook',
            'message', 'Sending webhook request',
            'data', jsonb_build_object('url', v_function_url, 'has_payload', true),
            'timestamp', extract(epoch from now()) * 1000,
            'sessionId', 'debug-session',
            'runId', 'run1',
            'hypothesisId', 'B'
        );
        PERFORM net.http_post(
            url := v_log_url,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := v_log_payload::text
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to send before_webhook log: %', SQLERRM;
    END;
    
    -- Send HTTP POST request to Edge Function
    -- Use pg_net to make async HTTP request (non-blocking)
    BEGIN
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
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to send webhook to Edge Function: %', SQLERRM;
    END;
    
    -- Log after sending webhook
    BEGIN
        v_log_payload := jsonb_build_object(
            'location', 'notify_application_submitted:after_webhook',
            'message', 'Webhook request sent',
            'data', jsonb_build_object('url', v_function_url),
            'timestamp', extract(epoch from now()) * 1000,
            'sessionId', 'debug-session',
            'runId', 'run1',
            'hypothesisId', 'B'
        );
        PERFORM net.http_post(
            url := v_log_url,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := v_log_payload::text
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to send after_webhook log: %', SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        BEGIN
            v_log_payload := jsonb_build_object(
                'location', 'notify_application_submitted:error',
                'message', 'Trigger error',
                'data', jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE),
                'timestamp', extract(epoch from now()) * 1000,
                'sessionId', 'debug-session',
                'runId', 'run1',
                'hypothesisId', 'F'
            );
            PERFORM net.http_post(
                url := v_log_url,
                headers := jsonb_build_object('Content-Type', 'application/json'),
                body := v_log_payload::text
            );
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to send error log: %', SQLERRM;
        END;
        RAISE WARNING 'Failed to trigger webhook: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger exists and is enabled
DROP TRIGGER IF EXISTS on_application_submitted ON applications;
CREATE TRIGGER on_application_submitted
    AFTER INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION notify_application_submitted();

-- 4. Verify trigger was created (this will show in migration output)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_application_submitted' 
        AND tgrelid = 'applications'::regclass
    ) THEN
        RAISE NOTICE 'Trigger on_application_submitted created successfully';
    ELSE
        RAISE WARNING 'Trigger on_application_submitted was NOT created';
    END IF;
END $$;
