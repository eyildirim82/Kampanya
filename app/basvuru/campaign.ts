import { unstable_noStore as noStore } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase-client';

export type CampaignRecord = {
    id: string;
    is_active?: boolean;
    campaign_code?: string | null;
    slug?: string | null;
    name?: string | null;
    title?: string | null;
    created_at?: string | null;
    page_content?: any; // JSONB
    extra_fields_schema?: any[]; // JSONB
    institution?: {
        name: string;
        logo_url?: string;
        primary_color?: string;
        secondary_color?: string;
    };
};

export function slugify(input: string): string {
    return input
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function getActiveCampaigns(): Promise<CampaignRecord[]> {
    noStore();
    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from('campaigns')
        .select('*, institution:institutions(name, logo_url, primary_color, secondary_color)')
        .or('status.eq.active,is_active.eq.true')
        .order('created_at', { ascending: false });

    const list = (data || []) as CampaignRecord[];
    return list;
}

export async function getDefaultCampaignId(): Promise<string | null> {
    const campaigns = await getActiveCampaigns();
    return campaigns[0]?.id || null;
}

export async function resolveCampaignId(campaignId?: string | null): Promise<string | null> {
    if (!campaignId) return getDefaultCampaignId();

    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from('campaigns')
        .select('id, is_active')
        .eq('id', campaignId)
        .or('status.eq.active,is_active.eq.true')
        .maybeSingle();

    return data?.id || null;
}

export async function getCampaignBySlug(slug: string): Promise<CampaignRecord | null> {
    const supabase = getSupabaseClient();
    // 1. Try direct match on slug column
    const { data } = await supabase
        .from('campaigns')
        .select('*, institution:institutions(name, logo_url, primary_color, secondary_color)')
        .eq('slug', slug)
        .or('status.eq.active,is_active.eq.true')
        .maybeSingle();

    if (data) return data;

    // 2. Fallback: Try matching other fields via slugify (legacy)
    const normalizedSlug = slugify(slug);
    const campaigns = await getActiveCampaigns();

    const matched = campaigns.find((campaign) => {
        const candidateValues = [
            campaign.campaign_code,
            campaign.name,
            campaign.title
        ]
            .filter(Boolean) as string[];

        return candidateValues.some((value) => slugify(value) === normalizedSlug);
    });

    return matched || null;
}

