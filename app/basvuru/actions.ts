'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { validateTckn } from '@/lib/tckn';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { tcknSchema, phoneSchema, fullNameSchema, emailSchemaOptional } from '@/lib/schemas';
import { resolveCampaignId } from './campaign';
import { getSupabaseClient } from '@/lib/supabase-client';
import { sendTransactionalEmail } from '@/lib/mail-service';

// ----------------------------------------------------------------------
// Helpers (orchestration only; no business rules)
// ----------------------------------------------------------------------

function getClientIp(headersList: Headers): string {
    return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || '127.0.0.1';
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
    QUOTA_EXCEEDED: 'Kontenjan dolmuştur.',
    DUPLICATE_ENTRY: 'Bu kampanya için daha önce başvuru yapılmıştır.',
    CAMPAIGN_NOT_FOUND: 'Kampanya bulunamadı.',
    CAMPAIGN_CLOSED: 'Bu kampanya şu an başvuruya kapalı.',
};

type SubmitRpcResult = { success: boolean; message?: string; code?: string; application_id?: string; errors?: Record<string, string[]> };

function mapRpcErrorToMessage(code?: string | null, rpcMessage?: string | null): string {
    if (code && RPC_ERROR_MESSAGES[code]) return RPC_ERROR_MESSAGES[code];
    if (rpcMessage) return rpcMessage;
    return 'Kaydedilemedi. Lütfen tekrar deneyiniz.';
}

function parseFormToRaw(formData: FormData): Record<string, unknown> {
    const raw: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
        if (!key.startsWith('$ACTION')) raw[key] = value;
    }
    ['addressSharingConsent', 'cardApplicationConsent', 'tcknPhoneSharingConsent'].forEach(k => {
        const v = raw[k];
        raw[k] = v === 'on' || v === 'true';
    });
    return raw;
}


/**
 * Generates a dynamic Zod schema based on the campaign's extra_fields_schema.
 */
function createDynamicSchema(extraFields: any[]) {
    const baseCols: Record<string, z.ZodTypeAny> = {
        tckn: tcknSchema,
        sessionToken: z.string().min(1, "Oturum süreniz dolmuş.")
    };

    extraFields.forEach(field => {
        let fieldSchema: z.ZodTypeAny;

        switch (field.type) {
            case 'input':
            case 'textarea':
                fieldSchema = z.string();
                if (field.is_required) {
                    fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} zorunludur.`);
                } else {
                    fieldSchema = fieldSchema.optional().or(z.literal(''));
                }

                // Apply additional validation rules
                if (field.validation_rules) {
                    const { min, max, pattern, pattern_message } = field.validation_rules;
                    if (min !== undefined && fieldSchema instanceof z.ZodString) {
                        fieldSchema = fieldSchema.min(min, `${field.label} en az ${min} karakter olmalıdır.`);
                    }
                    if (max !== undefined && fieldSchema instanceof z.ZodString) {
                        fieldSchema = fieldSchema.max(max, `${field.label} en fazla ${max} karakter olmalıdır.`);
                    }
                    if (pattern && fieldSchema instanceof z.ZodString) {
                        fieldSchema = fieldSchema.regex(new RegExp(pattern), pattern_message || `${field.label} formatı geçersiz.`);
                    }
                }
                break;
            case 'select':
                fieldSchema = z.string();
                if (field.is_required) {
                    fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} seçimi zorunludur.`);
                } else {
                    fieldSchema = fieldSchema.optional().or(z.literal(''));
                }
                break;
            default:
                fieldSchema = z.any();
        }

        baseCols[field.id || field.label] = fieldSchema;
    });

    return z.object(baseCols);
}

export type FormState = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
};



// ----------------------------------------------------------------------
// ACTION: Verify TCKN Action (Start Flow)
// ----------------------------------------------------------------------
export async function verifyTcknAction(tckn: string, campaignId?: string) {
    if (!validateTckn(tckn)) return { status: 'INVALID', message: 'Geçersiz TCKN (Algoritma).' };

    const targetCampaignId = await resolveCampaignId(campaignId);
    if (!targetCampaignId) return { status: 'ERROR', message: 'Aktif başvuru dönemi bulunamadı.' };

    const supabase = getSupabaseClient();
    try {
        // 1. Rate Limiting Check
        const { data: rateLimitOk, error: rateLimitError } = await supabase
            .rpc('check_rate_limit', { p_tckn: tckn, p_action: 'verify_tckn' });

        if (rateLimitError || !rateLimitOk) {
            return { status: 'RATE_LIMIT', message: 'Çok fazla deneme yaptınız. Lütfen bir saat sonra tekrar deneyiniz.' };
        }

        // 2. TALPA Üyelik Kontrolü (Whitelist)
        const { data: memberStatus, error: memberError } = await supabase
            .rpc('verify_member', { p_tckn_plain: tckn });

        if (memberError || !memberStatus || memberStatus.length === 0) {
            return { status: 'NOT_FOUND', message: 'TALPA listesinde kaydınız bulunamadı. Lütfen TALPA ile iletişime geçiniz.' };
        }

        const member = memberStatus[memberStatus.length - 1]; // Use latest entry

        // Logic check: is_active=true AND is_debtor=false
        if (member.status === 'DEBTOR') {
            return {
                status: 'BLOCKED',
                message: 'Derneğimizde bulunan borcunuz nedeniyle işleminize devam edilememektedir. Lütfen muhasebe birimi ile iletişime geçiniz.'
            };
        }

        if (member.status !== 'ACTIVE') {
            return { status: 'INACTIVE', message: 'Üyeliğiniz aktif görünmüyor. Lütfen TALPA ile iletişime geçiniz.' };
        }

        // 4. Check Existing Application (p_member_id unused; identity by tckn)
        const { data: checkResult } = await supabase.rpc('check_existing_application', {
            p_tckn_plain: tckn,
            p_campaign_id: targetCampaignId,
            p_member_id: null
        });

        if (checkResult?.exists) {
            return {
                status: 'EXISTS',
                message: 'Bu T.C. Kimlik Numarası ile daha önce yapılmış bir başvuru bulunmaktadır.'
            };
        }

        // Success -> HMAC Signed session token
        const sessionToken = createSessionToken(tckn, { campaignId: targetCampaignId });
        return { status: 'SUCCESS', memberId: member.tckn, sessionToken };

    } catch (err) {
        logger.error('verifyTcknAction error', err instanceof Error ? err : undefined);
        return { status: 'ERROR', message: 'Sorgulama sırasında teknik bir aksaklık oluştu.' };
    }
}



export async function submitApplication(_prevState: FormState, formData: FormData): Promise<FormState> {
    const headersList = await headers();
    const client_ip = getClientIp(headersList);
    const rawData = parseFormToRaw(formData);

    if (!rawData.sessionToken) return { success: false, message: 'Oturum bilgisi bulunamadı.' };

    const requestedCampaignId = typeof rawData.campaignId === 'string' ? rawData.campaignId : undefined;
    const targetCampaignId = await resolveCampaignId(requestedCampaignId);
    if (!targetCampaignId) return { success: false, message: 'Aktif kampanya yok.' };

    const sessionTckn = verifySessionToken(String(rawData.sessionToken), { campaignId: targetCampaignId });
    if (!sessionTckn) return { success: false, message: 'Oturum süreniz dolmuş. Lütfen tekrar doğrulama yapınız.' };
    if (sessionTckn !== rawData.tckn) return { success: false, message: 'Kimlik doğrulama hatası.' };

    const supabase = getSupabaseClient();

    try {
        // 1. Fetch Campaign Details (including schema and rules)
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('*, field_templates(*), email_rules(*)')
            .eq('id', targetCampaignId)
            .single();

        if (campaignError || !campaign) {
            return { success: false, message: 'Kampanya detayları alınamadı.' };
        }

        // 2. Dynamic Zod Validation
        const dynamicSchema = createDynamicSchema(campaign.extra_fields_schema || []);
        const validated = dynamicSchema.safeParse(rawData);
        if (!validated.success) {
            return {
                success: false,
                errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
                message: 'Form verileri geçersiz.'
            };
        }

        // 3. Logic Router for Email Rules
        let emailConfig = {
            subject: campaign.default_email_subject,
            html: campaign.default_email_html,
            senderName: campaign.default_sender_name
        };

        const matchedRule = (campaign.email_rules || []).find((rule: any) => {
            const val = rawData[rule.condition_field];
            return String(val) === String(rule.condition_value);
        });

        if (matchedRule) {
            emailConfig = {
                subject: matchedRule.email_subject || emailConfig.subject,
                html: matchedRule.email_html || emailConfig.html,
                senderName: matchedRule.sender_name || emailConfig.senderName
            };
        }

        // 4. Trigger Email FIRST (No Email, No Save)
        // If email fails, the process is halted before DB save.
        try {
            await sendTransactionalEmail({
                to: String(rawData.email || ''),
                subject: emailConfig.subject,
                html: emailConfig.html,
                senderName: emailConfig.senderName,
                data: { ...rawData, tckn: sessionTckn }
            });
        } catch (mailError) {
            logger.error('Mail delivery failure', mailError instanceof Error ? mailError : undefined);
            return { success: false, message: 'Email Error - Lütfen tekrar deneyiniz.' };
        }

        // 5. Save to Database
        const { data: rpcResult, error: dbError } = await supabase.rpc('submit_dynamic_application_secure', {
            p_campaign_id: targetCampaignId,
            p_tckn: sessionTckn,
            p_form_data: rawData,
            p_client_ip: client_ip
        });

        if (dbError || !(rpcResult as SubmitRpcResult | null)?.success) {
            const result = rpcResult as SubmitRpcResult | null;
            return {
                success: false,
                message: mapRpcErrorToMessage(result?.code, result?.message),
                errors: (result?.errors as Record<string, string[]>) || {}
            };
        }

        return { success: true, message: 'Başvurunuz başarıyla alınmıştır.' };

    } catch (e) {
        logger.error('Submit Flow Panic', e as Error);
        return { success: false, message: 'Sistem hatası. Lütfen daha sonra tekrar deneyiniz.' };
    }
}
