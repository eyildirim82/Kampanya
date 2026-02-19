import React from 'react';
import { redirect } from 'next/navigation';
import ApplicationTable from '@/components/admin/ApplicationTable';
import DashboardFilter from '@/components/admin/DashboardFilter';
import { getActiveCampaignsForFilter } from './dashboard/actions';
import { getApplications } from './actions';
import { Application } from '@/types';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminDashboardPage(props: Props) {
    const searchParams = await props.searchParams;
    const campaignIdParam = typeof searchParams.campaignId === 'string' ? searchParams.campaignId : undefined;

    const campaigns = await getActiveCampaignsForFilter();

    // Kampanya seçili değilse ilk kampanyaya yönlendir (sadece kampanyaya göre filtrelenmiş başvurular)
    if (!campaignIdParam && campaigns.length > 0) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            if (typeof value === 'string') params.set(key, value);
            else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
        }
        params.set('campaignId', campaigns[0].id);
        redirect(`/admin?${params.toString()}`);
    }

    const campaignId = campaignIdParam && campaignIdParam !== 'all' ? campaignIdParam : undefined;
    const applicationsResult = await getApplications(campaignId);
    const applications = (applicationsResult.data || []) as Application[];

    return (
        <div className="space-y-8">
            <DashboardFilter campaigns={campaigns} />

            <div id="uygulamalar" className="min-h-[200px] scroll-mt-6">
                <ApplicationTable applications={applications || []} loading={false} />
            </div>
        </div>
    );
}
