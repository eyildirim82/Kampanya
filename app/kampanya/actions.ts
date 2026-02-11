'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Use Anon Key for public submissions
// For Docker networking
const supabaseInternalUrl = process.env.SUPABASE_INTERNAL_URL || supabaseUrl;

export async function submitDynamicApplication(formData: FormData) {
    const supabase = createClient(supabaseInternalUrl, supabaseKey);

    // Extract metadata
    const campaignId = formData.get('campaignId') as string;
    // const campaignSlug = formData.get('campaignSlug') as string;

    if (!campaignId) {
        return { success: false, message: 'Kampanya bilgisi eksik.' };
    }

    // Convert FormData to JSON object
    const rawData: Record<string, any> = {};
    formData.forEach((value, key) => {
        if (key !== 'campaignId' && key !== 'campaignSlug') {
            rawData[key] = value;
        }
    });

    // Extract TCKN if present (for indexing/checks)
    const tckn = rawData['tckn'] as string;

    // Check if TCKN logic is required? 
    // For now we treat it as a generic submission.
    // If TCKN exists, we should probably save it in the tckn column too.

    const payload: any = {
        campaign_id: campaignId,
        form_data: rawData,
        status: 'PENDING'
    };

    if (tckn) {
        payload.tckn = tckn;
    }

    // Insert
    const { error } = await supabase
        .from('applications')
        .insert(payload);

    if (error) {
        console.error('Dynamic Submit Error:', error);
        return { success: false, message: 'Başvuru sırasında bir hata oluştu: ' + error.message };
    }

    return { success: true, message: 'Başvurunuz alındı.' };
}

export async function getCampaignBySlug(slug: string) {
    const supabase = createClient(supabaseInternalUrl, supabaseKey);

    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true) // Only public active campaigns
        .single();

    if (error) {
        console.error('Fetch Campaign Error:', error);
        return null;
    }
    return data;
}
