'use server';

import { getSupabaseClient } from '@/lib/supabase-client';
import { revalidatePath } from 'next/cache';
import { Campaign, CampaignType } from '@/types';

// Helper to get campaign by ID with all details
export async function getCampaignById(id: string): Promise<Campaign | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;

    // Map DB columns to our Types
    return {
        id: data.id,
        title: data.name,
        slug: data.slug,
        campaignCode: data.campaign_code,
        description: data.description,
        type: CampaignType.GENERAL,
        status: data.status || (data.is_active ? 'active' : 'draft'),
        active: data.is_active,
        maxQuota: data.max_quota,
        startDate: data.start_date,
        endDate: data.end_date,
        formSchema: data.form_schema || [], // Assuming column passed as JSON
        pageContent: data.page_content || {}, // Assuming JSON column
        institutionId: data.institution_id
    };
}

export async function updateCampaignConfigAction(id: string, payload: any) {
    const supabase = getSupabaseClient();

    // Construct DB update payload
    const dbPayload: any = {};
    if (payload.title) dbPayload.name = payload.title;
    if (payload.slug) dbPayload.slug = payload.slug;
    if (payload.description) dbPayload.description = payload.description;

    if (payload.formSchema) {
        dbPayload.form_schema = payload.formSchema;
    }

    if (payload.pageContent) {
        dbPayload.page_content = payload.pageContent;
    }

    const { error } = await supabase
        .from('campaigns')
        .update(dbPayload)
        .eq('id', id);

    if (error) {
        console.error('Update Campaign Error:', error);
        return { success: false, message: 'Güncelleme hatası: ' + error.message };
    }

    revalidatePath(`/admin/campaigns/${id}`);
    revalidatePath(`/admin/campaigns`);

    return { success: true, message: 'Başarıyla güncellendi.' };
}
