-- ==============================================
-- ADU-09: Fix Quota Race Condition
-- Adds row locking to submit_dynamic_application_secure
-- ==============================================

CREATE OR REPLACE FUNCTION public.submit_dynamic_application_secure(
    p_campaign_id UUID,
    p_tckn TEXT,
    p_form_data JSONB,
    p_client_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_campaign RECORD;
    v_member_id UUID;
    v_existing_id UUID;
    v_app_id UUID;
    v_app_count INTEGER;
    v_rate_ok BOOLEAN;
BEGIN
    -- 1. Validate TCKN format (11 digits)
    IF p_tckn IS NULL OR length(p_tckn) != 11 OR p_tckn !~ '^[0-9]{11}$' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Geçersiz TC Kimlik Numarası.');
    END IF;

    -- 2. Rate limiting by IP
    IF p_client_ip IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM applications
            WHERE form_data->>'client_ip' = p_client_ip
              AND created_at > NOW() - INTERVAL '1 minute'
            HAVING COUNT(*) >= 3
        ) INTO v_rate_ok;

        IF v_rate_ok IS FALSE THEN
            RETURN jsonb_build_object('success', false, 'message', 'Çok fazla başvuru yapıldı. Lütfen bekleyiniz.');
        END IF;
    END IF;

    -- 3. Verify campaign exists, is active, and within date range
    -- CRITICAL CHANGE: Use FOR UPDATE to lock the campaign row
    -- This prevents concurrent quota checks from reading stale data
    SELECT id, name, status, max_quota, start_date, end_date
    INTO v_campaign
    FROM campaigns
    WHERE id = p_campaign_id AND status = 'active'
    FOR UPDATE;

    IF v_campaign.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kampanya bulunamadı veya aktif değil.');
    END IF;

    IF v_campaign.start_date IS NOT NULL AND CURRENT_DATE < v_campaign.start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kampanya henüz başlamamış.');
    END IF;

    IF v_campaign.end_date IS NOT NULL AND CURRENT_DATE > v_campaign.end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kampanya süresi dolmuş.');
    END IF;

    -- 4. Check quota (Concurrency Safe now due to FOR UPDATE above)
    IF v_campaign.max_quota IS NOT NULL THEN
        SELECT COUNT(*) INTO v_app_count
        FROM applications WHERE campaign_id = p_campaign_id;

        IF v_app_count >= v_campaign.max_quota THEN
            RETURN jsonb_build_object('success', false, 'message', 'Kampanya kotası dolmuştur.');
        END IF;
    END IF;

    -- 5. Verify member whitelist
    SELECT id INTO v_member_id
    FROM member_whitelist
    WHERE tckn = p_tckn AND is_active = true;

    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Üye bulunamadı.');
    END IF;

    -- 6. Duplicate check
    SELECT id INTO v_existing_id
    FROM applications
    WHERE campaign_id = p_campaign_id AND tckn = p_tckn;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bu kampanya için zaten başvurunuz bulunmaktadır.');
    END IF;

    -- 7. Insert
    INSERT INTO applications (
        campaign_id, member_id, tckn, email, phone, full_name,
        form_data, status
    ) VALUES (
        p_campaign_id, v_member_id, p_tckn,
        p_form_data->>'email',
        COALESCE(p_form_data->>'phone', p_form_data->>'phoneNumber'),
        COALESCE(p_form_data->>'full_name', p_form_data->>'fullName', p_form_data->>'name'),
        p_form_data, 'PENDING'
    ) RETURNING id INTO v_app_id;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', v_app_id,
        'message', 'Başvurunuz başarıyla alındı.'
    );
END;
$$;
