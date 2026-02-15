'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySessionToken } from '@/lib/session-token';
import { getSupabaseUrl } from '@/lib/supabase-url';
import { getSupabaseClient } from '@/lib/supabase-client';
import { sendTransactionalEmail } from '@/lib/mail-service';
import { logger } from '@/lib/logger';

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

export async function updateCampaignConfig(id: string, updates: any, previousSlug?: string | null) {
    const adminSupabase = await getAdminClient();
    if (!adminSupabase) return { success: false, message: 'Yetkisiz işlem.' };

    const { error } = await adminSupabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Update Campaign Error:', error);
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function createCampaign(prevState: any, formData: FormData) {
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

