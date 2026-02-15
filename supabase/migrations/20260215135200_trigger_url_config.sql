-- Centralized Edge Function URL for triggers. No hardcoded production URL in trigger bodies.
-- Production: set via ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- or app.settings.edge_function_url = 'https://your-project.supabase.co/functions/v1/process-email';
-- See supabase/TRIGGER_URL_CONFIG.md.

CREATE OR REPLACE FUNCTION public.get_edge_function_url()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_url text;
BEGIN
  BEGIN
    v_url := current_setting('app.settings.edge_function_url', true);
  EXCEPTION WHEN OTHERS THEN v_url := NULL; END;

  IF v_url IS NOT NULL AND trim(v_url) <> '' THEN
    RETURN trim(v_url);
  END IF;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN v_url := NULL; END;

  IF v_url IS NOT NULL AND trim(v_url) <> '' THEN
    RETURN rtrim(trim(v_url), '/') || '/functions/v1/process-email';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_edge_function_url() IS
  'Edge Function process-email URL. Set app.settings.supabase_url or app.settings.edge_function_url for production; local dev may rely on trigger fallback.';

-- Update applications trigger to use centralized URL (fallback to localhost only when unset)
CREATE OR REPLACE FUNCTION notify_application_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_function_url TEXT;
    v_payload JSONB;
    v_service_role_key TEXT;
    v_log_url TEXT := 'http://127.0.0.1:7247/ingest/f93d5c7d-e15e-4725-83b1-8e8a375674f4';
    v_log_payload JSONB;
BEGIN
    BEGIN
        v_log_payload := jsonb_build_object(
            'location', 'notify_application_submitted:trigger_start',
            'message', 'Trigger fired',
            'data', jsonb_build_object('application_id', NEW.id, 'email', NEW.email, 'has_email', (NEW.email IS NOT NULL AND NEW.email != '')),
            'timestamp', extract(epoch from now()) * 1000, 'sessionId', 'debug-session', 'runId', 'run1', 'hypothesisId', 'A'
        );
        PERFORM net.http_post(url := v_log_url, headers := jsonb_build_object('Content-Type', 'application/json'), body := v_log_payload::text);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send trigger log: %', SQLERRM; END;

    v_function_url := public.get_edge_function_url();
    IF v_function_url IS NULL OR v_function_url = '' THEN
        v_function_url := 'http://127.0.0.1:54321/functions/v1/process-email';
    END IF;

    BEGIN
        v_log_payload := jsonb_build_object('location', 'notify_application_submitted:url_resolved', 'message', 'Function URL resolved', 'data', jsonb_build_object('function_url', v_function_url), 'timestamp', extract(epoch from now()) * 1000, 'sessionId', 'debug-session', 'runId', 'run1', 'hypothesisId', 'B');
        PERFORM net.http_post(url := v_log_url, headers := jsonb_build_object('Content-Type', 'application/json'), body := v_log_payload::text);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send URL log: %', SQLERRM; END;

    BEGIN v_service_role_key := current_setting('app.settings.service_role_key', true); EXCEPTION WHEN OTHERS THEN v_service_role_key := NULL; END;

    v_payload := jsonb_build_object('type', 'INSERT', 'table', 'applications', 'record', jsonb_build_object('id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name, 'campaign_id', NEW.campaign_id, 'created_at', NEW.created_at), 'schema', 'public', 'old_record', NULL);

    BEGIN
        v_log_payload := jsonb_build_object('location', 'notify_application_submitted:before_webhook', 'message', 'Sending webhook request', 'data', jsonb_build_object('url', v_function_url, 'has_payload', true), 'timestamp', extract(epoch from now()) * 1000, 'sessionId', 'debug-session', 'runId', 'run1', 'hypothesisId', 'B');
        PERFORM net.http_post(url := v_log_url, headers := jsonb_build_object('Content-Type', 'application/json'), body := v_log_payload::text);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send before_webhook log: %', SQLERRM; END;

    BEGIN
        PERFORM net.http_post(
            url := v_function_url,
            headers := CASE WHEN v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_role_key) ELSE jsonb_build_object('Content-Type', 'application/json') END,
            body := v_payload::text
        );
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send webhook to Edge Function: %', SQLERRM; END;

    BEGIN
        v_log_payload := jsonb_build_object('location', 'notify_application_submitted:after_webhook', 'message', 'Webhook request sent', 'data', jsonb_build_object('url', v_function_url), 'timestamp', extract(epoch from now()) * 1000, 'sessionId', 'debug-session', 'runId', 'run1', 'hypothesisId', 'B');
        PERFORM net.http_post(url := v_log_url, headers := jsonb_build_object('Content-Type', 'application/json'), body := v_log_payload::text);
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send after_webhook log: %', SQLERRM; END;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        BEGIN
            v_log_payload := jsonb_build_object('location', 'notify_application_submitted:error', 'message', 'Trigger error', 'data', jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE), 'timestamp', extract(epoch from now()) * 1000, 'sessionId', 'debug-session', 'runId', 'run1', 'hypothesisId', 'F');
            PERFORM net.http_post(url := v_log_url, headers := jsonb_build_object('Content-Type', 'application/json'), body := v_log_payload::text);
        EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Failed to send error log: %', SQLERRM; END;
        RAISE WARNING 'Failed to trigger webhook: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
