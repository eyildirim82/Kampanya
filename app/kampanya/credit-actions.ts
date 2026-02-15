'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { validateTckn } from '@/lib/tckn';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { tcknSchema, fullNameSchema, phoneSchema } from '@/lib/schemas';
import { getSupabaseClient } from '@/lib/supabase-client';
import { sendTransactionalEmail } from '@/lib/mail-service';

// ----------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------
const CREDIT_CAMPAIGN_CODE =
  process.env.NEXT_PUBLIC_CREDIT_CAMPAIGN_CODE || 'CREDIT_2026';

const STATUS = {
  INVALID: 'INVALID',
  ERROR: 'ERROR',
  NOT_FOUND: 'NOT_FOUND',
  EXISTS: 'EXISTS',
  NEW_MEMBER: 'NEW_MEMBER',
} as const;

const PLACEHOLDER_EMAIL = 'no-email@denizbank-kredi.com';
const DEFAULT_EMAIL_SUBJECT = 'Yeni kredi başvurusu';
const DEFAULT_EMAIL_HTML =
  '<p>Yeni bir kredi başvurusu alındı.</p><p>Başvuran: {{fullName}}, Telefon: {{phone}}</p>';
const DEFAULT_SENDER_NAME = 'TALPA';

const BOOLEAN_FORM_KEYS = ['phoneSharingConsent', 'tcknSharingConsent'] as const;

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------
interface CampaignEmailSettings {
  default_email_subject?: string | null;
  default_email_html?: string | null;
  default_sender_name?: string | null;
}

/** verify_member RPC satır tipi */
interface VerifyMemberRow {
  status: string;
}

/** check_existing_application RPC dönüş tipi */
interface CheckExistingApplicationResult {
  exists?: boolean;
}

/** submit_dynamic_application_secure RPC dönüş tipi */
interface SubmitDynamicApplicationResult {
  success: boolean;
  message?: string;
}

// ----------------------------------------------------------------------
// HELPER: Get Credit Campaign ID
// ----------------------------------------------------------------------
async function getCreditCampaignId(
  preferredCampaignId?: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (preferredCampaignId) {
    const { data: explicitCampaign } = await supabase
      .from('campaigns')
      .select('id, is_active')
      .eq('id', preferredCampaignId)
      .eq('is_active', true)
      .maybeSingle();

    if (explicitCampaign?.id) return explicitCampaign.id;
  }

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const activeCampaigns = (campaigns || []) as Array<{
    id: string;
    campaign_code?: string | null;
    name?: string | null;
    title?: string | null;
  }>;

  const byCode = activeCampaigns.find(
    (c) => c.campaign_code === CREDIT_CAMPAIGN_CODE
  );
  if (byCode) return byCode.id;

  const byName = activeCampaigns.find((c) =>
    (c.name || c.title || '').toLocaleLowerCase('tr-TR').includes('kredi')
  );
  return byName?.id ?? activeCampaigns[0]?.id ?? null;
}

// ----------------------------------------------------------------------
// HELPER: Parse FormData to raw object (exclude $ACTION keys, coerce booleans)
// ----------------------------------------------------------------------
function parseCreditFormData(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('$ACTION')) raw[key] = value;
  }
  for (const k of BOOLEAN_FORM_KEYS) {
    const v = raw[k];
    raw[k] = v === 'on' || v === 'true';
  }
  return raw;
}

// ----------------------------------------------------------------------
// HELPER: Resolve campaign email settings with defaults
// ----------------------------------------------------------------------
function resolveEmailSettings(
  campaign: CampaignEmailSettings | null
): { subject: string; html: string; senderName: string } {
  return {
    subject: campaign?.default_email_subject ?? DEFAULT_EMAIL_SUBJECT,
    html: campaign?.default_email_html ?? DEFAULT_EMAIL_HTML,
    senderName: campaign?.default_sender_name ?? DEFAULT_SENDER_NAME,
  };
}

// ----------------------------------------------------------------------
// ACTION: Check Credit TCKN Status
// ----------------------------------------------------------------------
export async function checkCreditTcknStatus(tckn: string, campaignId?: string) {
  if (!validateTckn(tckn)) {
    return { status: STATUS.INVALID, message: 'Geçersiz TCKN (Algoritma).' };
  }

  const targetCampaignId = await getCreditCampaignId(campaignId);
  if (!targetCampaignId) {
    return { status: STATUS.ERROR, message: 'Aktif kredi kampanyası bulunamadı.' };
  }

  const supabase = getSupabaseClient();
  try {
    const { data: rawMemberStatus, error: memberError } = await supabase.rpc(
      'verify_member',
      { p_tckn_plain: tckn }
    );
    const memberStatus = rawMemberStatus as VerifyMemberRow[] | null;

    if (
      memberError ||
      !memberStatus ||
      memberStatus.length === 0 ||
      memberStatus[0].status === STATUS.NOT_FOUND
    ) {
      return {
        status: STATUS.NOT_FOUND,
        message: 'TALPA üyeliğiniz doğrulanamadı.',
      };
    }

    const { data: rawCheckResult } = await supabase.rpc(
      'check_existing_application',
      {
        p_tckn_plain: tckn,
        p_campaign_id: targetCampaignId,
        p_member_id: null,
      }
    );
    const checkResult = rawCheckResult as CheckExistingApplicationResult | null;

    if (checkResult?.exists) {
      return {
        status: STATUS.EXISTS,
        message: 'Bu kampanya için zaten başvurunuz bulunmaktadır.',
      };
    }

    const sessionToken = createSessionToken(tckn, {
      campaignId: targetCampaignId,
      purpose: 'credit',
    });
    return {
      status: STATUS.NEW_MEMBER,
      message: 'Başarılı',
      sessionToken,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Credit Check Error', err);
    return { status: STATUS.ERROR, message: 'Sistem hatası.' };
  }
}

// ----------------------------------------------------------------------
// FORM SCHEMA & TYPES
// ----------------------------------------------------------------------
const formSchema = z.object({
  tckn: tcknSchema,
  fullName: fullNameSchema,
  phone: phoneSchema,
  isDenizbankCustomer: z.enum(['yes', 'no']),
  requestedAmount: z.enum([
    '1_000_000',
    '2_000_000',
    '5_000_000',
    'other',
  ]),
  phoneSharingConsent: z.boolean(),
  tcknSharingConsent: z.boolean(),
});

export type ValidatedCreditForm = z.infer<typeof formSchema>;

export type FormState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

// ----------------------------------------------------------------------
// HELPER: Validate session and resolve campaign ID
// ----------------------------------------------------------------------
async function validateSessionAndCampaign(rawData: Record<string, unknown>): Promise<
  | { ok: true; targetCampaignId: string; tckn: string }
  | { ok: false; message: string }
> {
  if (!rawData.sessionToken) {
    return { ok: false, message: 'Oturum hatası.' };
  }
  const requestedCampaignId =
    typeof rawData.campaignId === 'string' ? rawData.campaignId : undefined;
  const targetCampaignId = await getCreditCampaignId(requestedCampaignId);
  if (!targetCampaignId) {
    return { ok: false, message: 'Kampanya bulunamadı.' };
  }
  const sessionTckn = verifySessionToken(String(rawData.sessionToken), {
    campaignId: targetCampaignId,
    purpose: 'credit',
  });
  if (!sessionTckn || sessionTckn !== rawData.tckn) {
    return { ok: false, message: 'Oturum geçersiz.' };
  }
  return {
    ok: true,
    targetCampaignId,
    tckn: String(rawData.tckn),
  };
}

// ----------------------------------------------------------------------
// HELPER: Fetch campaign email settings
// ----------------------------------------------------------------------
async function fetchCampaignEmailSettings(
  campaignId: string
): Promise<CampaignEmailSettings | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('campaigns')
    .select('default_email_subject, default_email_html, default_sender_name')
    .eq('id', campaignId)
    .single();
  return data as CampaignEmailSettings | null;
}

// ----------------------------------------------------------------------
// HELPER: Send credit notification email
// ----------------------------------------------------------------------
async function sendCreditNotificationEmail(params: {
  to: string;
  subject: string;
  html: string;
  senderName: string;
  data: ValidatedCreditForm;
}): Promise<void> {
  await sendTransactionalEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    senderName: params.senderName,
    data: {
      fullName: params.data.fullName,
      phone: params.data.phone,
      isDenizbankCustomer: params.data.isDenizbankCustomer,
      requestedAmount: params.data.requestedAmount,
    },
  });
}

// ----------------------------------------------------------------------
// HELPER: Submit credit application via RPC
// ----------------------------------------------------------------------
async function submitCreditApplicationRpc(params: {
  campaignId: string;
  data: ValidatedCreditForm;
  ip: string;
  userAgent: string;
}): Promise<{
  data: SubmitDynamicApplicationResult | null;
  error: unknown;
}> {
  const consentMetadata = {
    ip: params.ip,
    userAgent: params.userAgent,
    timestamp: new Date().toISOString(),
    consentVersion: 'v1.0-credit',
  };
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc(
    'submit_dynamic_application_secure',
    {
      p_campaign_id: params.campaignId,
      p_tckn: params.data.tckn,
      p_form_data: {
        fullName: params.data.fullName,
        phone: params.data.phone,
        email: PLACEHOLDER_EMAIL,
        isDenizbankCustomer: params.data.isDenizbankCustomer,
        requestedAmount: params.data.requestedAmount,
        phoneSharingConsent: params.data.phoneSharingConsent,
        tcknSharingConsent: params.data.tcknSharingConsent,
        consent_metadata: consentMetadata,
      },
      p_client_ip: params.ip,
    }
  );
  return {
    data: data as SubmitDynamicApplicationResult | null,
    error,
  };
}

// ----------------------------------------------------------------------
// FORM ACTIONS
// ----------------------------------------------------------------------
export async function submitCreditApplication(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

  const rawData = parseCreditFormData(formData);

  const sessionResult = await validateSessionAndCampaign(rawData);
  if (!sessionResult.ok) {
    return { success: false, message: sessionResult.message };
  }
  const { targetCampaignId } = sessionResult;

  const validated = formSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, message: 'Form hatalı.' };
  }
  const data: ValidatedCreditForm = validated.data;

  const krediNotifyTo =
    process.env.KREDI_NOTIFICATION_EMAIL || process.env.SMTP_USER || '';
  if (!krediNotifyTo) {
    logger.error(
      'Kredi notification: KREDI_NOTIFICATION_EMAIL veya SMTP_USER tanımlı değil',
      undefined
    );
    return {
      success: false,
      message: 'Kredi bildirimi yapılandırılmamış. Lütfen tekrar deneyiniz.',
    };
  }

  try {
    const campaign = await fetchCampaignEmailSettings(targetCampaignId);
    const emailSettings = resolveEmailSettings(campaign);

    try {
      await sendCreditNotificationEmail({
        to: krediNotifyTo,
        subject: emailSettings.subject,
        html: emailSettings.html,
        senderName: emailSettings.senderName,
        data,
      });
    } catch (mailErr) {
      const err = mailErr instanceof Error ? mailErr : new Error(String(mailErr));
      logger.error('Kredi notification email failed', err);
      return {
        success: false,
        message: 'Bildirim e-postası gönderilemedi. Lütfen tekrar deneyiniz.',
      };
    }

    const userAgent = headersList.get('user-agent') || 'Unknown';
    const { data: rpcResult, error: dbError } = await submitCreditApplicationRpc({
      campaignId: targetCampaignId,
      data,
      ip,
      userAgent,
    });

    if (dbError || !rpcResult?.success) {
      const errCode =
        dbError && typeof dbError === 'object' && 'code' in dbError
          ? (dbError as { code: string }).code
          : undefined;
      logger.error('Credit Submit RPC failed', undefined, {
        code: errCode,
        messageKey: rpcResult?.message ? 'rpc_message' : 'db_error',
      });
      return {
        success: false,
        message: rpcResult?.message || 'Kaydedilemedi.',
      };
    }

    return { success: true, message: 'Başvurunuz alınmıştır.' };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error('Credit Submit Panic', err);
    return { success: false, message: 'Sistem hatası.' };
  }
}
