-- ==============================================
-- Block Direct Updates to is_active
-- Prevents data desynchronization by enforcing status state machine
-- ==============================================

CREATE OR REPLACE FUNCTION check_is_active_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if is_active is modified (NEW vs OLD)
    -- AND status is NOT modified (meaning it's a direct update to is_active)
    -- If status IS modified, we assume the change to is_active is correct (handled by sync trigger)
    IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Direct update of is_active is not allowed. Use transition_campaign_status RPC or update status column.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow idempotency
DROP TRIGGER IF EXISTS trg_block_direct_is_active_update ON public.campaigns;

-- Create Trigger
-- Naming starts with 'trg_block' to ensure alphabetical precedence before 'trg_sync' (optional but good practice)
CREATE TRIGGER trg_block_direct_is_active_update
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION check_is_active_update();

-- Comment explaining the deprecation
COMMENT ON COLUMN public.campaigns.is_active IS 'DEPRECATED: Read-only. Managed automatically by status column. Do not update directly.';
