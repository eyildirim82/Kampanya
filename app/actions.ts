'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySessionToken } from '@/lib/session-token';
import { getSupabaseUrl } from '@/lib/supabase-url';
import { getSupabaseClient, getServiceRoleClient } from '@/lib/supabase-client';
import { sendTransactionalEmail } from '@/lib/mail-service';
import { logger } from '@/lib/logger';
import type { Database, TablesUpdate } from '@/types/supabase';

// Campaign form field schema interface
export interface CampaignFormField {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
    validation?: Record<string, unknown>;
}

async function getAdminClient() {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!token || !refreshToken) return null;

    const client = getSupabaseClient();

    const { error } = await client.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
    });

    if (error) return null;
    return client;
}

export async function getCampaignById(id: string) {
    const adminSupabase = await getAdminClient();
    // Fallback to anon client if not admin (for public viewing if needed, though usually by slug)
    // But for editing we need admin.
    const client = adminSupabase || getSupabaseClient();

    const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getCampaignBySlug(slug: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) return null;
    return data;
}

export async function updateCampaignConfig(id: string, updates: TablesUpdate<'campaigns'>, previousSlug?: string | null) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Yetkisiz işlem.' };

    const { error } = await adminSupabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

    if (error) {
        logger.error('Update Campaign Error', error instanceof Error ? error : new Error(String(error)));
        return { success: false, message: error.message };
    }

    revalidatePath(`/admin/campaigns/${id}`);
    if (updates.slug) revalidatePath(`/kampanya/${updates.slug}`);
    if (previousSlug && previousSlug !== updates.slug) revalidatePath(`/kampanya/${previousSlug}`);
    revalidatePath('/');
    return { success: true, message: 'Güncellendi.' };
}

export async function getCampaigns() {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return [];

    const { data } = await adminSupabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    return data || [];
}

export async function getActiveCampaigns() {
    const client = getSupabaseClient();
    const { data } = await client
        .from('campaigns')
        .select('*')
        .or('status.eq.active,is_active.eq.true')
        .order('created_at', { ascending: false });
    return data || [];
}

type CampaignActionResult = { success: boolean; message: string };
export async function createCampaign(prevState: CampaignActionResult | undefined, formData: FormData) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Yetkisiz.' };

    const name = formData.get('name') as string;
    const campaignCode = formData.get('campaignCode') as string;
    const isActive = formData.get('isActive') === 'on';

    if (!name) return { success: false, message: 'İsim gerekli.' };

    const { error } = await adminSupabase
        .from('campaigns')
        .insert({
            name,
            campaign_code: campaignCode || `CAMP_${Date.now()}`,
            is_active: isActive
        });

    if (error) return { success: false, message: error.message };

    revalidatePath('/admin/campaigns');
    revalidatePath('/'); // Revalidate homepage to show new campaign
    return { success: true, message: 'Oluşturuldu.' };
}

// toggleCampaignStatus removed. Use administrative actions to manage campaign status.

/**
 * Dinamik kampanya başvurusu. Session token zorunludur (TCKN doğrulama + whitelist sonrası alınır).
 * No Email, No Save: önce kampanya e-posta ayarlarına göre e-posta gönderilir, başarısızsa kayıt yapılmaz.
 */
export async function submitDynamicApplication(
    campaignId: string,
    formData: Record<string, unknown>,
    sessionToken: string
) {
    const tckn = verifySessionToken(sessionToken, { campaignId });
    if (!tckn) {
        return { success: false, message: 'Oturum süreniz dolmuş veya geçersiz. Lütfen sayfayı yenileyip tekrar TCKN ile başlayınız.' };
    }

    const client = getSupabaseClient();

    let clientIp: string | null = null;
    try {
        const { headers } = await import('next/headers');
        const headersList = await headers();
        clientIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || null;
    } catch {
        // Headers not available outside request context
    }

    // 1. Fetch campaign with email rules (No Email, No Save)
    const { data: campaign, error: campaignError } = await client
        .from('campaigns')
        .select('*, field_templates(*), email_rules(*)')
        .eq('id', campaignId)
        .single();

    if (campaignError || !campaign) {
        return { success: false, message: 'Kampanya bulunamadı.' };
    }

    // --- Server-Side Validation Start ---
    const formSchemaDef = (campaign.form_schema as CampaignFormField[]) || [];
    const shape: Record<string, z.ZodTypeAny> = {};

    formSchemaDef.forEach((field) => {
        let validator: z.ZodTypeAny;

        switch (field.type) {
            case 'email':
                validator = z.string().email('Geçerli bir e-posta adresi giriniz.');
                break;
            case 'checkbox':
                validator = z.boolean();
                if (field.required) {
                    validator = validator.refine((val) => val === true, 'Bu alanı onaylamanız gerekmektedir.');
                }
                break;
            case 'number':
                validator = z.string().regex(/^\d+$/, 'Sadece rakam giriniz.');
                break;
            default:
                validator = z.string();
        }

        if (field.required && field.type !== 'checkbox') {
            if (['email', 'text', 'textarea', 'select', 'number'].includes(field.type)) {
                if (validator instanceof z.ZodString) {
                    validator = validator.min(1, `${field.label} zorunludur.`);
                }
            }
        } else if (!field.required && field.type !== 'checkbox') {
            if (validator instanceof z.ZodString) {
                validator = validator.optional().or(z.literal(''));
            }
        }

        // TCKN Validation
        if (field.name === 'tckn' || field.name === 'tc') {
            validator = z.string().length(11, 'TCKN 11 haneli olmalıdır.');
            if (!field.required) validator = validator.optional().or(z.literal(''));
        }

        // Phone Validation
        if (field.name === 'phone') {
            validator = z.string().min(10, 'Telefon numarası en az 10 haneli olmalıdır.');
            if (!field.required) validator = validator.optional().or(z.literal(''));
        }

        shape[field.name] = validator;
    });

    const FormSchema = z.object(shape);
    const validationResult = FormSchema.safeParse(formData);

    if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return { success: false, message: firstError.message || 'Form doğrulama hatası.' };
    }
    // --- Server-Side Validation End ---

    const emailConfig = {
        subject: (campaign.default_email_subject as string) || 'Başvuru Alındı',
        html: (campaign.default_email_html as string) || '<p>Başvurunuz alınmıştır.</p>',
        senderName: (campaign.default_sender_name as string) || 'TALPA'
    };

    const rules = (campaign.email_rules || []) as Array<{ condition_field?: string; condition_value?: string; email_subject?: string; email_html?: string; sender_name?: string }>;
    const matchedRule = rules.find((rule) => {
        const val = formData[rule.condition_field as string];
        return val !== undefined && String(val) === String(rule.condition_value);
    });
    if (matchedRule) {
        if (matchedRule.email_subject) emailConfig.subject = matchedRule.email_subject;
        if (matchedRule.email_html) emailConfig.html = matchedRule.email_html;
        if (matchedRule.sender_name) emailConfig.senderName = matchedRule.sender_name;
    }

    const toEmail = String((formData as Record<string, unknown>).email ?? '').trim();
    if (!toEmail) {
        return { success: false, message: 'E-posta adresi gerekli.' };
    }

    try {
        await sendTransactionalEmail({
            to: toEmail,
            subject: emailConfig.subject,
            html: emailConfig.html,
            senderName: emailConfig.senderName,
            data: { ...formData, tckn }
        });
    } catch (mailError) {
        logger.error('Mail delivery failure', mailError instanceof Error ? mailError : undefined);
        return { success: false, message: 'E-posta gönderilemedi. Lütfen tekrar deneyiniz.' };
    }

    const { data, error } = await client.rpc('submit_dynamic_application_secure', {
        p_campaign_id: campaignId,
        p_tckn: tckn,
        p_form_data: formData,
        p_client_ip: clientIp,
    });

    if (error) {
        return { success: false, message: 'Başvuru alınamadı. Lütfen tekrar deneyiniz.' };
    }

    return data as { success: boolean; message: string; application_id?: string };
}

export async function queryApplicationStatus(tckn: string, phone: string) {
    // 1. Validate inputs
    if (!tckn || tckn.length !== 11) {
        return { success: false, message: 'Geçersiz T.C. Kimlik Numarası.' };
    }
    if (!phone) {
        return { success: false, message: 'Telefon numarası gerekli.' };
    }

    // 2. Use service role client to call RPC (bypasses RLS, secure RPC call)
    // RPC returns only: id, created_at, status, campaign_name (limited PII exposure)
    const serviceClient = getServiceRoleClient();

    const { data, error } = await serviceClient.rpc('get_application_status_by_tckn_phone', {
        p_tckn: tckn,
        p_phone: phone
    });

    if (error) {
        logger.error('Query application status error', { error: error.message, tckn: '[REDACTED]', phone: '[REDACTED]' });
        return { success: false, message: 'Sorgulama sırasında bir hata oluştu.' };
    }

    if (!data || data.length === 0) {
        return { success: false, message: 'T.C. Kimlik Numarası ve Telefon bilgisine ait kayıt bulunamadı.' };
    }

    // Limit to last 5 applications
    const limitedData = data.slice(0, 5);

    return {
        success: true,
        applications: limitedData.map((app) => ({
            id: app.id,
            status: app.status,
            campaignName: app.campaign_name || 'Bilinmeyen Kampanya',
            createdAt: app.created_at
        }))
    };
}

