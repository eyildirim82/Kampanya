-- Migration: Verify Trigger Exists and is Working
-- This migration checks if the trigger was created and provides diagnostic information

-- 1. Check if pg_net extension exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE NOTICE 'pg_net extension is installed';
    ELSE
        RAISE WARNING 'pg_net extension is NOT installed - this is required for webhook triggers';
    END IF;
END $$;

-- 2. Check if trigger function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'notify_application_submitted'
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE NOTICE 'Function notify_application_submitted exists';
    ELSE
        RAISE WARNING 'Function notify_application_submitted does NOT exist';
    END IF;
END $$;

-- 3. Check if trigger exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_application_submitted' 
        AND tgrelid = 'applications'::regclass
    ) THEN
        RAISE NOTICE 'Trigger on_application_submitted exists on applications table';
    ELSE
        RAISE WARNING 'Trigger on_application_submitted does NOT exist on applications table';
    END IF;
END $$;

-- 4. Show trigger details
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as is_enabled,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_application_submitted'
AND t.tgrelid = 'applications'::regclass;
