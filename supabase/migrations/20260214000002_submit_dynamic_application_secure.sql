-- Secure Application Submission RPC (Atomic)
-- Ensures: pessimistic locking, campaign state/dates, whitelist eligibility, quota, duplicate check.
-- Return type: { success boolean, message text, application_id uuid } for app compatibility.

CREATE OR REPLACE FUNCTION submit_dynamic_application_secure(
  p_campaign_id uuid,
  p_tckn text,
  p_form_data jsonb,
  p_client_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF COALESCE(v_campaign.status, '') <> 'active' THEN
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

COMMENT ON FUNCTION submit_dynamic_application_secure(uuid, text, jsonb, text) IS
  'Atomik başvuru kaydı: kampanya kilidi (FOR UPDATE), durum/tarih, whitelist uygunluk, kota ve mükerrer kontrol.';
