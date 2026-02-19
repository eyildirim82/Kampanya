'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeCampaignStatus, deleteCampaign } from '../actions';
import { toast } from 'sonner';
import Link from 'next/link';

type Campaign = {
    id: string;
    campaign_code: string;
    name: string;
    slug?: string;
    description?: string;
    status: 'draft' | 'active' | 'paused' | 'closed';
    is_active: boolean;
    max_quota?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at: string;
    application_count?: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Taslak', color: 'text-gray-700', bg: 'bg-gray-100' },
    active: { label: 'Aktif', color: 'text-green-700', bg: 'bg-green-100' },
    paused: { label: 'Duraklatılmış', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    closed: { label: 'Kapatılmış', color: 'text-red-700', bg: 'bg-red-100' },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['active'],
    active: ['paused', 'closed'],
    paused: ['active', 'closed'],
    closed: [],
};

export default function CampaignListClient({ campaigns }: { campaigns: Campaign[] }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleStatusChange = (campaignId: string, newStatus: string) => {
        if (!confirm(`Kampanya durumunu "${STATUS_CONFIG[newStatus]?.label}" olarak değiştirmek istiyor musunuz?`)) return;

        startTransition(async () => {
            const result = await changeCampaignStatus(campaignId, newStatus);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleDelete = (campaignId: string, campaignName: string) => {
        if (!confirm(`"${campaignName}" kampanyasını silmek istiyor musunuz? Bu işlem geri alınamaz.`)) return;

        startTransition(async () => {
            const result = await deleteCampaign(campaignId);
            if (result.success) {
                toast.success('Kampanya silindi.');
                router.refresh();
            } else {
                toast.error(result.message || 'Kampanya silinemedi.');
            }
        });
    };

    if (!campaigns.length) {
        return (
            <div className="text-center py-12 bg-white rounded-lg shadow">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz kampanya yok</h3>
                <p className="mt-1 text-sm text-gray-500">Yeni bir kampanya oluşturarak başlayın.</p>
                <div className="mt-6">
                    <Link
                        href="/admin/campaigns/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-talpa-navy hover:bg-talpa-navy/80"
                    >
                        + Yeni Kampanya
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kampanya
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Başvuru
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarih Aralığı
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Aksiyonlar</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map((campaign) => {
                        const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                        const transitions = VALID_TRANSITIONS[campaign.status] || [];
                        const quotaText = campaign.max_quota
                            ? `${campaign.application_count || 0} / ${campaign.max_quota}`
                            : `${campaign.application_count || 0}`;

                        return (
                            <tr key={campaign.id} className={isPending ? 'opacity-50' : ''}>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                                    <div className="text-sm text-gray-500">{campaign.campaign_code}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                                        {statusConf.label}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {quotaText}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {campaign.start_date && campaign.end_date
                                        ? `${new Date(campaign.start_date).toLocaleDateString('tr-TR')} – ${new Date(campaign.end_date).toLocaleDateString('tr-TR')}`
                                        : campaign.start_date
                                            ? `${new Date(campaign.start_date).toLocaleDateString('tr-TR')} –`
                                            : '—'
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {transitions.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => handleStatusChange(campaign.id, t)}
                                            disabled={isPending}
                                            className={`text-xs px-2 py-1 rounded border transition-colors ${t === 'active' ? 'border-green-300 text-green-700 hover:bg-green-50' :
                                                t === 'paused' ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' :
                                                    'border-red-300 text-red-700 hover:bg-red-50'
                                                }`}
                                        >
                                            {STATUS_CONFIG[t]?.label}
                                        </button>
                                    ))}
                                    <Link
                                        href={`/admin/campaigns/${campaign.id}`}
                                        className="text-xs px-2 py-1 rounded border border-primary/30 text-talpa-navy hover:bg-primary/5 transition-colors"
                                    >
                                        Düzenle
                                    </Link>
                                    {campaign.status === 'draft' && (
                                        <button
                                            onClick={() => handleDelete(campaign.id, campaign.name)}
                                            disabled={isPending}
                                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                                        >
                                            Sil
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
