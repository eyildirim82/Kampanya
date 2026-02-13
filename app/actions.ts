'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAdminClient() {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!token || !refreshToken) return null;

    const client = createClient(supabaseUrl, supabaseKey);

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
    const client = adminSupabase || createClient(supabaseUrl, supabaseKey);

    const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getCampaignBySlug(slug: string) {
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) return null;
    return data;
}

export async function updateCampaignConfig(id: string, updates: any) {
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
    revalidatePath(`/kampanya/${updates.slug}`);
    revalidatePath('/'); // Revalidate homepage to update links
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
    const client = createClient(supabaseUrl, supabaseKey);
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

export async function submitDynamicApplication(campaignId: string, formData: any) {
    const client = createClient(supabaseUrl, supabaseKey);

    // Extract TCKN from various possible field names
    const tckn = formData.tckn || formData.tc || formData.identityNumber || '';

    // Get client IP for rate limiting (best effort from headers)
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

    // Call the secure RPC — all validation happens in the DB
    const { data, error } = await client.rpc('submit_dynamic_application_secure', {
        p_campaign_id: campaignId,
        p_tckn: tckn,
        p_form_data: formData,
        p_client_ip: clientIp,
    });

    if (error) {
        console.error('Submit RPC Error:', error);
        return { success: false, message: 'Başvuru alınamadı. Lütfen tekrar deneyiniz.' };
    }

    // data is the JSONB result from the RPC
    return data as { success: boolean; message: string; application_id?: string };
}

