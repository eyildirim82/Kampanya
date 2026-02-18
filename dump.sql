


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."agreement_status_enum" AS ENUM (
    'active',
    'inactive',
    'pending',
    'expired'
);


ALTER TYPE "public"."agreement_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."application_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REVIEWING'
);


ALTER TYPE "public"."application_status" OWNER TO "postgres";


CREATE TYPE "public"."campaign_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'closed'
);


ALTER TYPE "public"."campaign_status" OWNER TO "postgres";


CREATE TYPE "public"."email_recipient_type" AS ENUM (
    'applicant',
    'admin',
    'custom'
);


ALTER TYPE "public"."email_recipient_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("exists" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM applications a
    WHERE a.campaign_id = p_campaign_id AND a.tckn = p_tckn_plain
  ) AS "exists";
$$;


ALTER FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid") IS 'Aynı kampanya için aynı TCKN ile başvuru var mı. p_member_id kullanılmıyor (geri uyumluluk için varsayılan NULL).';



CREATE OR REPLACE FUNCTION "public"."check_is_active_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if is_active is modified (NEW vs OLD)
    -- AND status is NOT modified (meaning it's a direct update to is_active)
    -- If status IS modified, we assume the change to is_active is correct (handled by sync trigger)
    IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Direct update of is_active is not allowed. Use transition_campaign_status RPC or update status column.';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_is_active_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_member_status"("input_tckn" "text") RETURNS TABLE("member_exists" boolean, "member_email" "text", "has_app" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tckn text := NULLIF(trim(input_tckn), '');
  v_member_exists boolean := false;
  v_member_email text := NULL;
  v_has_app boolean := false;
BEGIN
  IF v_tckn IS NULL OR length(v_tckn) <> 11 THEN
    RETURN QUERY SELECT false, NULL::text, false;
    RETURN;
  END IF;

  -- Check whitelist and get email (from whitelist or latest application)
  SELECT true INTO v_member_exists
  FROM public.member_whitelist m
  WHERE m.tckn = v_tckn
  LIMIT 1;

  IF v_member_exists THEN
    SELECT COALESCE(
      (SELECT mw.email FROM public.member_whitelist mw WHERE mw.tckn = v_tckn LIMIT 1),
      (SELECT a.email FROM public.applications a WHERE a.tckn = v_tckn AND a.email IS NOT NULL AND a.email <> '' ORDER BY a.created_at DESC LIMIT 1)
    ) INTO v_member_email;

    SELECT EXISTS(
      SELECT 1 FROM public.applications a WHERE a.tckn = v_tckn LIMIT 1
    ) INTO v_has_app;
  END IF;

  RETURN QUERY SELECT v_member_exists, v_member_email, v_has_app;
END;
$$;


ALTER FUNCTION "public"."check_member_status"("input_tckn" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_member_status"("input_tckn" "text") IS 'OTP akışı için üye durumu: member_exists, member_email (whitelist veya son başvuru), has_app.';



CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
BEGIN
  IF p_tckn IS NULL OR p_tckn = '' OR p_action IS NULL OR p_action = '' THEN
    RETURN false;
  END IF;

  SELECT count(*)::int INTO v_count
  FROM public.rate_limit_entries
  WHERE tckn = p_tckn
    AND action = p_action
    AND created_at > (now() - interval '1 hour');

  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_entries (tckn, action)
  VALUES (p_tckn, p_action);

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") IS 'Aynı TCKN ve action için saatte en fazla 3 isteğe izin verir; yeni kayıt ekler ve limit aşılmadıysa true döner.';



CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_ip_address" "inet", "p_endpoint" "text", "p_max_requests" integer DEFAULT 10, "p_window_minutes" integer DEFAULT 60) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current count and window start for this IP and endpoint
    SELECT request_count, window_start 
    INTO v_count, v_window_start
    FROM rate_limit
    WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint;
    
    -- If no record exists or window expired, create/reset
    IF v_count IS NULL OR v_window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
        INSERT INTO rate_limit (ip_address, endpoint, request_count, window_start)
        VALUES (p_ip_address, p_endpoint, 1, NOW())
        ON CONFLICT (ip_address, endpoint) 
        DO UPDATE SET 
            request_count = 1,
            window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- Check if limit exceeded
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    UPDATE rate_limit 
    SET request_count = request_count + 1
    WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_ip_address" "inet", "p_endpoint" "text", "p_max_requests" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_rate_limits"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM rate_limit 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_tckn"("p_encrypted_tckn" "text", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_decrypted TEXT;
    v_admin_id UUID;
    v_role TEXT;
BEGIN
    -- Check if user is authenticated
    IF auth.role() <> 'service_role' AND auth.role() <> 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get Current User ID
    v_admin_id := auth.uid();

    -- Service role bypass
    IF auth.role() = 'service_role' THEN
         -- Proceed
    ELSE
        -- Check if user is in admins table
        SELECT role INTO v_role FROM admins WHERE id = v_admin_id;
        
        IF v_role IS NULL THEN
             RAISE EXCEPTION 'Access Denied: Admin privileges required.';
        END IF;

        IF v_role = 'viewer' THEN
             RAISE EXCEPTION 'Access Denied: Viewer role cannot decrypt sensitive data.';
        END IF;
    END IF;

    -- Decrypt
    BEGIN
        v_decrypted := pgp_sym_decrypt(decode(p_encrypted_tckn, 'hex'), p_key);
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL; -- Handle bad key or data
    END;

    -- Log to Audit Logs
    INSERT INTO audit_logs (admin_id, action, target_identifier, details)
    VALUES (
        v_admin_id, 
        'DECRYPT_TCKN', 
        NULL, 
        jsonb_build_object('success', (v_decrypted IS NOT NULL))
    );

    RETURN v_decrypted;
END;
$$;


ALTER FUNCTION "public"."decrypt_tckn"("p_encrypted_tckn" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_tckn"("p_tckn" "text", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(p_tckn, p_key), 'hex');
END;
$$;


ALTER FUNCTION "public"."encrypt_tckn"("p_tckn" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tckn_hash"("p_tckn" "text", "p_salt" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN encode(digest(p_tckn || p_salt, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."generate_tckn_hash"("p_tckn" "text", "p_salt" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agreements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "type" "text",
    "status" "public"."agreement_status_enum" DEFAULT 'pending'::"public"."agreement_status_enum",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agreements" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_agreements"() RETURNS SETOF "public"."agreements"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM agreements
    WHERE status = 'active'
    ORDER BY name ASC;
END;
$$;


ALTER FUNCTION "public"."get_active_agreements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_campaigns"() RETURNS TABLE("id" "uuid", "campaign_code" "text", "name" "text", "description" "text", "start_date" "date", "end_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_active_campaigns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "status" "text", "campaign_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    a.id,
    a.created_at,
    a.status,
    COALESCE(c.name, 'Genel Başvuru') AS campaign_name
  FROM applications a
  LEFT JOIN campaigns c ON c.id = a.campaign_id
  WHERE a.tckn = p_tckn
    AND a.phone = p_phone
  ORDER BY a.created_at DESC;
$$;


ALTER FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") IS 'TCKN ve telefon ile eşleşen başvuruların sadece durum bilgisini döndürür. Service role ile çağrılmalıdır.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_stats"() RETURNS TABLE("id" "uuid", "name" "text", "code" "text", "total" bigint, "approved" bigint, "rejected" bigint, "pending" bigint, "conversion_rate" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    c.id,
    c.name,
    c.campaign_code AS code,
    COUNT(a.id) AS total,
    COUNT(a.id) FILTER (WHERE a.status = 'APPROVED') AS approved,
    COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') AS rejected,
    COUNT(a.id) FILTER (WHERE a.status IN ('PENDING', 'REVIEWING')) AS pending,
    CASE
      WHEN COUNT(a.id) > 0 THEN ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'APPROVED') / COUNT(a.id), 1)::text
      ELSE '0.0'
    END AS conversion_rate
  FROM campaigns c
  LEFT JOIN applications a ON a.campaign_id = c.id
  GROUP BY c.id, c.name, c.campaign_code
  ORDER BY total DESC;
$$;


ALTER FUNCTION "public"."get_campaign_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_stats"() IS 'Dashboard kampanya istatistikleri; admin tarafından çağrılır.';



CREATE OR REPLACE FUNCTION "public"."get_edge_function_url"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."get_edge_function_url"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_edge_function_url"() IS 'Edge Function process-email URL. Set app.settings.supabase_url or app.settings.edge_function_url for production; local dev may rely on trigger fallback.';



CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.admins WHERE id = user_id LIMIT 1);
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"("user_id" "uuid") IS 'RLS helper: true if user is in admins table; null-safe for anon.';



CREATE OR REPLACE FUNCTION "public"."notify_application_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_application_submitted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_interest_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_interest_submitted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_application_secure"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_encrypted_tckn" "text", "p_form_data" "jsonb", "p_consent_metadata" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_application_secure"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_encrypted_tckn" "text", "p_form_data" "jsonb", "p_consent_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_member member_whitelist%ROWTYPE;
  v_app_count bigint;
  v_duplicate boolean;
  v_app_id uuid;
  v_phone text;
  v_full_name text;
  v_email text;
BEGIN
  -- 1. Pessimistic lock campaign row (atomic transaction)
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kampanya bulunamadı.',
      'code', 'CAMPAIGN_NOT_FOUND',
      'application_id', NULL
    );
  END IF;

  -- 2. State & date check: only 'active' and within start/end window
  -- FIX: Cast status enum to text for comparison
  IF COALESCE(v_campaign.status::text, '') <> 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bu kampanya şu an başvuruya kapalı.',
      'code', 'CAMPAIGN_CLOSED',
      'application_id', NULL
    );
  END IF;

  IF v_campaign.start_date IS NOT NULL AND current_date < v_campaign.start_date::date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kampanya henüz başlamadı.',
      'code', 'CAMPAIGN_CLOSED',
      'application_id', NULL
    );
  END IF;

  IF v_campaign.end_date IS NOT NULL AND current_date > v_campaign.end_date::date THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kampanya süresi dolmuştur.',
      'code', 'CAMPAIGN_CLOSED',
      'application_id', NULL
    );
  END IF;

  -- 3. Whitelist & eligibility: must exist, is_active = true, is_debtor = false
  SELECT * INTO v_member
  FROM member_whitelist
  WHERE tckn = p_tckn
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'TALPA listesinde kaydınız bulunamadı.',
      'code', 'ELIGIBILITY_FAILED',
      'application_id', NULL
    );
  END IF;

  IF COALESCE(v_member.is_active, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Üyelik durumunuz başvuru yapmaya uygun değildir.',
      'code', 'ELIGIBILITY_FAILED',
      'application_id', NULL
    );
  END IF;

  IF COALESCE(v_member.is_debtor, false) IS TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Derneğimizde bulunan borcunuz nedeniyle başvuru yapılamamaktadır.',
      'code', 'ELIGIBILITY_FAILED',
      'application_id', NULL
    );
  END IF;

  -- 4. Quota check (max_quota NULL = unlimited)
  IF v_campaign.max_quota IS NOT NULL THEN
    SELECT count(*) INTO v_app_count
    FROM applications
    WHERE campaign_id = p_campaign_id;

    IF v_app_count >= v_campaign.max_quota THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Kontenjan dolmuştur.',
        'code', 'QUOTA_EXCEEDED',
        'application_id', NULL
      );
    END IF;
  END IF;

  -- 5. Duplicate check: same TCKN already applied to this campaign
  SELECT EXISTS(
    SELECT 1 FROM applications
    WHERE campaign_id = p_campaign_id AND tckn = p_tckn
  ) INTO v_duplicate;

  IF v_duplicate THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bu kampanya için daha önce başvuru yapılmıştır.',
      'code', 'DUPLICATE_ENTRY',
      'application_id', NULL
    );
  END IF;

  -- 6. Insert application
  v_phone   := COALESCE(p_form_data->>'phone', '');
  v_full_name := COALESCE(p_form_data->>'fullName', '');
  v_email  := p_form_data->>'email';

  INSERT INTO applications (
    campaign_id,
    tckn,
    phone,
    full_name,
    email,
    status,
    form_data,
    client_ip
  ) VALUES (
    p_campaign_id,
    p_tckn,
    v_phone,
    v_full_name,
    v_email,
    'PENDING',
    p_form_data,
    p_client_ip
  )
  RETURNING id INTO v_app_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Başvurunuz alınmıştır.',
    'application_id', v_app_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bu kampanya için daha önce başvuru yapılmıştır.',
      'code', 'DUPLICATE_ENTRY',
      'application_id', NULL
    );
  WHEN OTHERS THEN
    RAISE;
END;
$$;


ALTER FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text") IS 'Atomik başvuru kaydı: kampanya kilidi (FOR UPDATE), durum/tarih, whitelist uygunluk, kota ve mükerrer kontrol.';



CREATE OR REPLACE FUNCTION "public"."sync_campaign_is_active"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_campaign_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_campaign_status"("p_campaign_id" "uuid", "p_new_status" "public"."campaign_status") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_admin_id UUID;
    v_old_status campaign_status;
    v_campaign_name TEXT;
    v_valid_transition BOOLEAN := false;
BEGIN
    -- 1. Check admin auth
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kimlik doğrulama gerekli');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = v_admin_id AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bu işlem için admin yetkisi gerekli');
    END IF;

    -- 2. Lock and get current campaign status
    SELECT status, name INTO v_old_status, v_campaign_name
    FROM public.campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kampanya bulunamadı');
    END IF;

    -- 3. Validate state transition
    v_valid_transition := CASE
        WHEN v_old_status = 'draft'   AND p_new_status = 'active' THEN true
        WHEN v_old_status = 'active'  AND p_new_status = 'paused' THEN true
        WHEN v_old_status = 'active'  AND p_new_status = 'closed' THEN true
        WHEN v_old_status = 'paused'  AND p_new_status = 'active' THEN true
        WHEN v_old_status = 'paused'  AND p_new_status = 'closed' THEN true
        ELSE false
    END;

    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Geçersiz durum geçişi: %s → %s', v_old_status, p_new_status),
            'old_status', v_old_status::text,
            'new_status', p_new_status::text
        );
    END IF;

    -- 4. Apply the transition
    UPDATE public.campaigns
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_campaign_id;

    -- 5. Audit log
    INSERT INTO public.audit_logs (admin_id, action, target_identifier, details)
    VALUES (
        v_admin_id,
        'TRANSITION_CAMPAIGN_STATUS',
        p_campaign_id::text,
        jsonb_build_object(
            'campaign_name', v_campaign_name,
            'old_status', v_old_status::text,
            'new_status', p_new_status::text
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Kampanya durumu değiştirildi: %s → %s', v_old_status, p_new_status),
        'old_status', v_old_status::text,
        'new_status', p_new_status::text
    );
END;
$$;


ALTER FUNCTION "public"."transition_campaign_status"("p_campaign_id" "uuid", "p_new_status" "public"."campaign_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_member"("p_tckn_plain" "text") RETURNS TABLE("tckn" "text", "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT m.tckn,
    CASE
      WHEN m.is_debtor THEN 'DEBTOR'::text
      WHEN COALESCE(m.is_active, true) THEN 'ACTIVE'::text
      ELSE 'INACTIVE'::text
    END
  FROM member_whitelist m
  WHERE m.tckn = p_tckn_plain
  LIMIT 1;
$$;


ALTER FUNCTION "public"."verify_member"("p_tckn_plain" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_member"("p_tckn_plain" "text") IS 'Whitelist üyelik kontrolü; DEBTOR/ACTIVE/INACTIVE veya boş (NOT_FOUND). PK artık tckn.';



CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'admin'::"text",
    CONSTRAINT "admins_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."admins" IS 'Admin panele giriş yetkisi; id auth.users.id ile eşleşir.';



CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid",
    "encrypted_tckn" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "district" "text",
    "kvkk_consent" boolean DEFAULT false,
    "open_consent" boolean DEFAULT false,
    "communication_consent" boolean DEFAULT false,
    "consent_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "form_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "dynamic_data" "jsonb" DEFAULT '{}'::"jsonb",
    "tckn" "text",
    "address_sharing_consent" boolean DEFAULT false NOT NULL,
    "card_application_consent" boolean DEFAULT false NOT NULL,
    "tckn_phone_sharing_consent" boolean DEFAULT false NOT NULL,
    "admin_notes" "text"
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."applications" IS 'Başvurular yalnızca submit_dynamic_application_secure RPC ile eklenir; anon doğrudan INSERT yapamaz.';



COMMENT ON COLUMN "public"."applications"."address_sharing_consent" IS 'Kart gönderimi için adres bilgimin ilgili şube ile paylaşılmasını onaylıyorum';



COMMENT ON COLUMN "public"."applications"."card_application_consent" IS 'Denizbank Yeşilköy Şubesinden kredi kartı başvurusu yapılmasını onaylıyorum';



COMMENT ON COLUMN "public"."applications"."tckn_phone_sharing_consent" IS 'TC kimlik ve telefon numaramın Denizbank Yeşilköy Şubesi ile paylaşılmasını onaylıyorum';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "target_identifier" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Admin işlemleri (export, bulk update vb.) için denetim kaydı.';



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "odoo_id" integer,
    "campaign_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "slug" "text",
    "form_schema" "jsonb" DEFAULT '[]'::"jsonb",
    "page_content" "jsonb" DEFAULT '{}'::"jsonb",
    "institution_id" "uuid",
    "status" "public"."campaign_status" DEFAULT 'draft'::"public"."campaign_status",
    "max_quota" integer,
    "extra_fields_schema" "jsonb" DEFAULT '[]'::"jsonb",
    "default_email_html" "text",
    "default_email_subject" "text",
    "default_sender_name" "text"
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaigns"."is_active" IS 'DEPRECATED: Read-only. Managed automatically by status column. Do not update directly.';



COMMENT ON COLUMN "public"."campaigns"."institution_id" IS 'FK to institutions table';



COMMENT ON COLUMN "public"."campaigns"."status" IS 'Campaign lifecycle: draft → active → paused/closed';



COMMENT ON COLUMN "public"."campaigns"."max_quota" IS 'Max applications allowed (NULL = unlimited)';



CREATE TABLE IF NOT EXISTS "public"."email_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "recipient_type" "public"."email_recipient_type" NOT NULL,
    "recipient_email" "text",
    "subject_template" "text" NOT NULL,
    "body_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "trigger_event" "text" DEFAULT 'SUBMISSION'::"text" NOT NULL
);


ALTER TABLE "public"."email_configurations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_configurations"."trigger_event" IS 'Event that triggers this email: SUBMISSION, STATUS_APPROVED, STATUS_REJECTED';



CREATE TABLE IF NOT EXISTS "public"."email_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "condition_field" "text",
    "condition_value" "text",
    "email_subject" "text",
    "email_html" "text",
    "sender_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."field_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "is_required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "field_templates_type_check" CHECK (("type" = ANY (ARRAY['input'::"text", 'select'::"text", 'textarea'::"text"])))
);


ALTER TABLE "public"."field_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "contact_email" "text",
    "logo_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_color" "text" DEFAULT '#00558d'::"text",
    "secondary_color" "text" DEFAULT '#002855'::"text"
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


COMMENT ON TABLE "public"."institutions" IS 'Kampanya yapılan kurumlar (DenizBank, vb.)';



COMMENT ON COLUMN "public"."institutions"."primary_color" IS 'Example: Button backgrounds, primary highlights (#E30613 for DenizBank)';



COMMENT ON COLUMN "public"."institutions"."secondary_color" IS 'Example: Headers, dark backgrounds (#002855 for TALPA)';



CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "tckn" "text",
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."interests" OWNER TO "postgres";


COMMENT ON TABLE "public"."interests" IS 'Talep formu ile gönderilen ön talepler; anon INSERT, admin SELECT/DELETE.';



CREATE TABLE IF NOT EXISTS "public"."member_whitelist" (
    "masked_name" "text",
    "is_active" boolean DEFAULT true,
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tckn" "text" NOT NULL,
    "is_debtor" boolean DEFAULT false,
    "email" "text"
);


ALTER TABLE "public"."member_whitelist" OWNER TO "postgres";


COMMENT ON COLUMN "public"."member_whitelist"."email" IS 'Üye e-posta (OTP gönderimi için); yoksa applications tablosundan son başvuru e-postası kullanılır.';



CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tckn" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:05:00'::interval),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit" (
    "ip_address" "inet" NOT NULL,
    "endpoint" "text" NOT NULL,
    "request_count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tckn" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limit_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limit_entries" IS 'check_rate_limit RPC için; aynı TCKN+action için saatte 3 deneme.';



CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sync_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text"]))),
    CONSTRAINT "sync_logs_sync_type_check" CHECK (("sync_type" = ANY (ARRAY['members'::"text", 'campaigns'::"text"])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agreements"
    ADD CONSTRAINT "agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_campaign_id_tckn_key" UNIQUE ("campaign_id", "tckn");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_campaign_code_key" UNIQUE ("campaign_code");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_odoo_id_key" UNIQUE ("odoo_id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."email_configurations"
    ADD CONSTRAINT "email_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_rules"
    ADD CONSTRAINT "email_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_templates"
    ADD CONSTRAINT "field_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_campaign_email_key" UNIQUE ("campaign_id", "email");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_whitelist"
    ADD CONSTRAINT "member_whitelist_pkey" PRIMARY KEY ("tckn");



ALTER TABLE ONLY "public"."member_whitelist"
    ADD CONSTRAINT "member_whitelist_tckn_key" UNIQUE ("tckn");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_entries"
    ADD CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit"
    ADD CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("ip_address", "endpoint");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "campaigns_campaign_code_unique_idx" ON "public"."campaigns" USING "btree" ("campaign_code");



CREATE INDEX "idx_applications_campaign" ON "public"."applications" USING "btree" ("campaign_id");



CREATE INDEX "idx_applications_campaign_id" ON "public"."applications" USING "btree" ("campaign_id");



CREATE UNIQUE INDEX "idx_applications_campaign_tckn_unique" ON "public"."applications" USING "btree" ("campaign_id", "tckn");



CREATE INDEX "idx_applications_created" ON "public"."applications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_applications_status" ON "public"."applications" USING "btree" ("status");



CREATE INDEX "idx_applications_tckn_phone" ON "public"."applications" USING "btree" ("tckn", "phone");



CREATE INDEX "idx_audit_logs_admin_id" ON "public"."audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_campaigns_active" ON "public"."campaigns" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_campaigns_code" ON "public"."campaigns" USING "btree" ("campaign_code");



CREATE INDEX "idx_campaigns_institution" ON "public"."campaigns" USING "btree" ("institution_id");



CREATE INDEX "idx_campaigns_slug" ON "public"."campaigns" USING "btree" ("slug");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_email_configs_trigger" ON "public"."email_configurations" USING "btree" ("trigger_event");



CREATE INDEX "idx_institutions_active" ON "public"."institutions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_institutions_code" ON "public"."institutions" USING "btree" ("code");



CREATE INDEX "idx_interests_campaign" ON "public"."interests" USING "btree" ("campaign_id");



CREATE INDEX "idx_interests_campaign_id" ON "public"."interests" USING "btree" ("campaign_id");



CREATE INDEX "idx_interests_tckn" ON "public"."interests" USING "btree" ("tckn");



CREATE INDEX "idx_member_whitelist_tckn" ON "public"."member_whitelist" USING "btree" ("tckn");



CREATE INDEX "idx_otp_expires" ON "public"."otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_otp_tckn" ON "public"."otp_codes" USING "btree" ("tckn");



CREATE INDEX "idx_rate_limit_entries_lookup" ON "public"."rate_limit_entries" USING "btree" ("tckn", "action", "created_at" DESC);



CREATE INDEX "idx_rate_limit_window" ON "public"."rate_limit" USING "btree" ("window_start");



CREATE INDEX "idx_sync_logs_created" ON "public"."sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_whitelist_active" ON "public"."member_whitelist" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "on_application_submitted" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."notify_application_submitted"();



CREATE OR REPLACE TRIGGER "on_interest_submitted" AFTER INSERT ON "public"."interests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_interest_submitted"();



CREATE OR REPLACE TRIGGER "trg_block_direct_is_active_update" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."check_is_active_update"();



CREATE OR REPLACE TRIGGER "trg_sync_campaign_is_active" BEFORE INSERT OR UPDATE OF "status" ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."sync_campaign_is_active"();



CREATE OR REPLACE TRIGGER "update_agreements_updated_at" BEFORE UPDATE ON "public"."agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whitelist_updated_at" BEFORE UPDATE ON "public"."member_whitelist" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."email_configurations"
    ADD CONSTRAINT "email_configurations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_rules"
    ADD CONSTRAINT "email_rules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



CREATE POLICY "Admin access to sync logs" ON "public"."sync_logs" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admins can delete interests" ON "public"."interests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage email configs" ON "public"."email_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins can view interests" ON "public"."interests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins delete applications" ON "public"."applications" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins full access campaigns" ON "public"."campaigns" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins full access to whitelist" ON "public"."member_whitelist" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins have full access to institutions" ON "public"."institutions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins manage agreements" ON "public"."agreements" TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins manage applications" ON "public"."applications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins read all agreements" ON "public"."agreements" FOR SELECT TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Admins read all applications" ON "public"."applications" FOR SELECT TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"())))));



CREATE POLICY "Admins read audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admins"
  WHERE ("admins"."id" = "auth"."uid"()))));



CREATE POLICY "Admins read own record" ON "public"."admins" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Allow public TCKN verification" ON "public"."member_whitelist" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow public campaign view" ON "public"."campaigns" FOR SELECT USING ((("is_active" = true) AND ("end_date" >= CURRENT_DATE)));



CREATE POLICY "Public can insert interests" ON "public"."interests" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can view active institutions" ON "public"."institutions" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_select_own" ON "public"."admins" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_admin_all" ON "public"."applications" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "applications_admin_select" ON "public"."applications" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "applications_admin_update" ON "public"."applications" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "applications_no_anon" ON "public"."applications" FOR SELECT USING (false);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_all" ON "public"."audit_logs" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_admin_all" ON "public"."campaigns" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "campaigns_read_active" ON "public"."campaigns" FOR SELECT USING ((("status" = 'active'::"public"."campaign_status") OR ("is_active" = true)));



ALTER TABLE "public"."email_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_rules_admin_all" ON "public"."email_rules" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."field_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "field_templates_admin_all" ON "public"."field_templates" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interests_admin_delete" ON "public"."interests" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "interests_admin_select" ON "public"."interests" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "interests_anon_insert" ON "public"."interests" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."member_whitelist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_whitelist_admin_all" ON "public"."member_whitelist" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "member_whitelist_no_anon" ON "public"."member_whitelist" FOR SELECT USING (false);



ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_existing_application"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_member_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_active_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_active_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_active_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_member_status"("input_tckn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_member_status"("input_tckn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_member_status"("input_tckn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_tckn" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "inet", "p_endpoint" "text", "p_max_requests" integer, "p_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "inet", "p_endpoint" "text", "p_max_requests" integer, "p_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_ip_address" "inet", "p_endpoint" "text", "p_max_requests" integer, "p_window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_tckn"("p_encrypted_tckn" "text", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_tckn"("p_encrypted_tckn" "text", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_tckn"("p_encrypted_tckn" "text", "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_tckn"("p_tckn" "text", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_tckn"("p_tckn" "text", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_tckn"("p_tckn" "text", "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tckn_hash"("p_tckn" "text", "p_salt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tckn_hash"("p_tckn" "text", "p_salt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tckn_hash"("p_tckn" "text", "p_salt" "text") TO "service_role";



GRANT ALL ON TABLE "public"."agreements" TO "anon";
GRANT ALL ON TABLE "public"."agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."agreements" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_agreements"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_agreements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_agreements"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_campaigns"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_campaigns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_campaigns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_application_status_by_tckn_phone"("p_tckn" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_edge_function_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_edge_function_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_edge_function_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_application_submitted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_application_submitted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_application_submitted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_interest_submitted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_interest_submitted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_interest_submitted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_application_secure"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_encrypted_tckn" "text", "p_form_data" "jsonb", "p_consent_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_application_secure"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_encrypted_tckn" "text", "p_form_data" "jsonb", "p_consent_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_application_secure"("p_tckn_plain" "text", "p_campaign_id" "uuid", "p_encrypted_tckn" "text", "p_form_data" "jsonb", "p_consent_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_dynamic_application_secure"("p_campaign_id" "uuid", "p_tckn" "text", "p_form_data" "jsonb", "p_client_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_campaign_is_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_campaign_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_campaign_is_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transition_campaign_status"("p_campaign_id" "uuid", "p_new_status" "public"."campaign_status") TO "anon";
GRANT ALL ON FUNCTION "public"."transition_campaign_status"("p_campaign_id" "uuid", "p_new_status" "public"."campaign_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transition_campaign_status"("p_campaign_id" "uuid", "p_new_status" "public"."campaign_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_member"("p_tckn_plain" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_member"("p_tckn_plain" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_member"("p_tckn_plain" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_configurations" TO "anon";
GRANT ALL ON TABLE "public"."email_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."email_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."email_rules" TO "anon";
GRANT ALL ON TABLE "public"."email_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."email_rules" TO "service_role";



GRANT ALL ON TABLE "public"."field_templates" TO "anon";
GRANT ALL ON TABLE "public"."field_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."field_templates" TO "service_role";



GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";



GRANT ALL ON TABLE "public"."interests" TO "anon";
GRANT ALL ON TABLE "public"."interests" TO "authenticated";
GRANT ALL ON TABLE "public"."interests" TO "service_role";



GRANT ALL ON TABLE "public"."member_whitelist" TO "anon";
GRANT ALL ON TABLE "public"."member_whitelist" TO "authenticated";
GRANT ALL ON TABLE "public"."member_whitelist" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_entries" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































