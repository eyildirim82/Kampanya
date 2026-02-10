import { createClient } from '@supabase/supabase-js';

type CampaignRecord = {
    id: string;
    is_active?: boolean;
    campaign_code?: string | null;
    name?: string | null;
    title?: string | null;
    created_at?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(input: string): string {
    return input
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function getActiveCampaigns(): Promise<CampaignRecord[]> {
    const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return (data || []) as CampaignRecord[];
}

export async function getDefaultCampaignId(): Promise<string | null> {
    const campaigns = await getActiveCampaigns();
    return campaigns[0]?.id || null;
}

export async function resolveCampaignId(campaignId?: string | null): Promise<string | null> {
    if (!campaignId) return getDefaultCampaignId();

    const { data } = await supabase
        .from('campaigns')
        .select('id, is_active')
        .eq('id', campaignId)
        .eq('is_active', true)
        .maybeSingle();

    return data?.id || null;
}

export async function getCampaignIdBySlug(slug: string): Promise<string | null> {
    const normalizedSlug = slugify(slug);
    const campaigns = await getActiveCampaigns();

    const matched = campaigns.find((campaign) => {
        const candidateValues = [
            campaign.campaign_code,
            campaign.name,
            campaign.title
        ].filter(Boolean) as string[];

        return candidateValues.some((value) => slugify(value) === normalizedSlug);
    });

    return matched?.id || null;
}
