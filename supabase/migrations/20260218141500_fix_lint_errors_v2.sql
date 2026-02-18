-- Add client_ip column to applications table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'client_ip') THEN
        ALTER TABLE public.applications ADD COLUMN client_ip text;
    END IF;
END $$;

-- Drop submit_application_secure dynamically to handle unknown signature
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as func_signature FROM pg_proc WHERE proname = 'submit_application_secure') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.func_signature;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping function: %', SQLERRM;
END $$;
