
import React from 'react';
import { getCampaigns } from '@/app/admin/actions';
import { getInterests } from '@/app/admin/actions';
import InterestTable from '@/components/admin/InterestTable';
import { Interest } from '@/types';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InterestsPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const campaignId = typeof searchParams.campaignId === 'string' ? searchParams.campaignId : undefined;

    const { data } = await getInterests(campaignId, 1, 5000);
    const interests: Interest[] = (data || []).map((item: any) => ({
        id: item.id,
        fullName: item.full_name,
        email: item.email,
        phone: item.phone,
        tckn: item.tckn,
        note: item.note,
        createdAt: item.created_at,
        campaignId: item.campaign_id,
        campaignName: item.campaigns?.title || item.campaigns?.name
    }));
    const campaigns = await getCampaigns();

    return (
        <div className="max-w-7xl mx-auto">
            <InterestTable initialInterests={interests} campaigns={campaigns} />
        </div>
    );
}
