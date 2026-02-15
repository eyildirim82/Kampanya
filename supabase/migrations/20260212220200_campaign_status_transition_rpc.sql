-- ==============================================
-- ADU-03: Campaign Status Transition RPC
-- State machine: draft→active, active→paused/closed, paused→active/closed
-- ==============================================

CREATE OR REPLACE FUNCTION public.transition_campaign_status(
    p_campaign_id UUID,
    p_new_status campaign_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.transition_campaign_status(UUID, campaign_status) TO authenticated;
