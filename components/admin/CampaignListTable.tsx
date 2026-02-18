'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/theme/Icon';
import { Campaign, CampaignStatus } from '@/types';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Alert from '@/components/theme/Alert';
import { changeCampaignStatus, deleteCampaign } from '@/app/admin/actions';
import { useRouter } from 'next/navigation';

async function updateStatusWrapper(id: string, status: CampaignStatus) {
    return changeCampaignStatus(id, status);
}

interface CampaignListTableProps {
    initialCampaigns: Campaign[];
}

const CampaignListTable: React.FC<CampaignListTableProps> = ({ initialCampaigns }) => {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStatusChange = async (id: string, newStatus: CampaignStatus) => {
        if (!window.confirm(`Kampanya durumunu '${newStatus}' olarak değiştirmek istiyor musunuz?`)) return;

        setError(null);
        setLoading(true);

        const prev = campaigns;
        // Optimistic update
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

        try {
            const result = await updateStatusWrapper(id, newStatus);
            if (!result?.success) {
                setError(result?.message || 'İşlem başarısız.');
                setCampaigns(prev);
            } else {
                router.refresh();
            }
        } catch {
            setError('İşlem başarısız.');
            setCampaigns(prev);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        setError(null);
        setLoading(true);
        const prev = campaigns;

        // Optimistic update
        setCampaigns(prev => prev.filter(c => c.id !== id));

        try {
            const result = await deleteCampaign(id);
            if (!result?.success) {
                setError(result?.message || 'Silme işlemi başarısız.');
                setCampaigns(prev);
            } else {
                router.refresh();
            }
        } catch {
            setError('Silme işlemi başarısız.');
            setCampaigns(prev);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status?: CampaignStatus) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Yayında</span>;
            case 'draft':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">Taslak</span>;
            case 'paused':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Durduruldu</span>;
            case 'closed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Kapandı</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Bilinmiyor</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin" className="text-slate-500 hover:text-talpa-navy flex items-center gap-1 text-sm mb-2 font-medium">
                        <Icon name="arrow_back" size="sm" /> Dashboard'a Dön
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Kampanya Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Tüm kampanyaları listeleyin ve yönetin.</p>
                </div>
                <Link href="/admin/campaigns/new">
                    <Button leftIcon={<Icon name="add" size="sm" />}>
                        Yeni Kampanya
                    </Button>
                </Link>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Card padding="none" className="overflow-hidden border border-slate-200 shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kampanya Bilgisi</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kurum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Başvuru / Kota</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih Aralığı</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Yükleniyor...</td></tr>
                            ) : campaigns.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-talpa-navy transition-colors">{campaign.title || campaign.name}</span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">{campaign.campaignCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                            {campaign.institutionName || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(campaign.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full w-24 overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${Math.min(((campaign.applicationCount || 0) / (campaign.maxQuota || 1000)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">{campaign.applicationCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            <div className="flex flex-col">
                                                <span>{new Date(campaign.createdAt || '').toLocaleDateString('tr-TR')}</span>
                                                {/* Using createdAt as placeholder if startDate missing for now */}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                {campaign.status === 'draft' && (
                                                    <button title="Yayınla" onClick={() => handleStatusChange(campaign.id, 'active')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                                        <Icon name="play_arrow" size="sm" />
                                                    </button>
                                                )}
                                                {campaign.status === 'active' && (
                                                    <button title="Durdur" onClick={() => handleStatusChange(campaign.id, 'paused')} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg">
                                                        <Icon name="pause" size="sm" />
                                                    </button>
                                                )}
                                                {campaign.status === 'paused' && (
                                                    <button title="Devam Et" onClick={() => handleStatusChange(campaign.id, 'active')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                                                        <Icon name="play_arrow" size="sm" />
                                                    </button>
                                                )}

                                                <Link href={`/admin/campaigns/${campaign.id}`}>
                                                    <button title="Düzenle" className="p-2 text-slate-400 hover:text-talpa-navy hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Icon name="edit" size="sm" />
                                                    </button>
                                                </Link>

                                                {campaign.status === 'draft' && (
                                                    <button title="Sil" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(campaign.id)}>
                                                        <Icon name="delete" size="sm" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default CampaignListTable;
