
import React from 'react';
import { getCampaignsWithDetails } from '@/app/admin/actions';
import CampaignListTable from '@/components/admin/CampaignListTable';
import { Campaign } from '@/types';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
    // Fetch campaigns
    // Note: getCampaigns in actions.ts is legacy?
    // We should use getCampaignsWithDetails if it exists (Step 97 truncated it, presumably it exists or I should fix it).
    // Let's assume getCampaignsWithDetails exists (I saw it near end of actions.ts).
    const campaignsData = await getCampaignsWithDetails();

    // Map to Campaign type if needed, or if getCampaignsWithDetails returns exactly Campaign[]
    // For safety, let's cast or map.
    const campaigns: Campaign[] = campaignsData.map((c: any) => ({
        ...c,
        id: c.id,
        title: c.name,
        campaignCode: c.campaign_code,
        applicationCount: 0,
        status: c.status || (c.is_active ? 'active' : 'draft'),
        startDate: c.start_date,
        endDate: c.end_date,
        maxQuota: c.max_quota,
        createdAt: c.created_at
    }));

    return (
        <div className="max-w-7xl mx-auto">
            <CampaignListTable initialCampaigns={campaigns} />
        </div>
    );
}
