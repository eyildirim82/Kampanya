
import React from 'react';
import { notFound } from 'next/navigation';
import { getCampaignById } from '@/app/admin/actions';
import CampaignEditor from '@/components/admin/CampaignEditor';
import { CampaignType } from '@/types';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage(props: PageProps) {
    const params = await props.params;

    const row = await getCampaignById(params.id);

    if (!row) {
        notFound();
    }

    const campaign = {
        id: row.id,
        title: row.name,
        name: row.name,
        slug: row.slug,
        campaignCode: row.campaign_code,
        description: row.description,
        type: CampaignType.GENERAL,
        status: row.status || (row.is_active ? 'active' : 'draft'),
        active: !!row.is_active,
        maxQuota: row.max_quota ?? null,
        startDate: row.start_date ?? null,
        endDate: row.end_date ?? null,
        formSchema: row.form_schema || [],
        pageContent: row.page_content || {},
        createdAt: row.created_at ?? undefined,
    };

    return (
        <div className="max-w-7xl mx-auto">
            <CampaignEditor campaign={campaign} />
        </div>
    );
}
