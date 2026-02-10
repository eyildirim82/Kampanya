'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    createCampaign,
    deleteCampaign,
    getCampaigns,
    toggleCampaignStatus
} from '../actions';

type Campaign = {
    id: string;
    name?: string;
    title?: string;
    campaign_code?: string;
    is_active: boolean;
    created_at?: string;
};

export default function CampaignManager() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const loadCampaigns = async () => {
        const data = await getCampaigns();
        setCampaigns(data);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadCampaigns();
    }, []);

    const handleCreate = async (formData: FormData) => {
        const result = await createCampaign(null, formData);
        setMessage(result.message || (result.success ? 'Kampanya oluşturuldu.' : 'İşlem başarısız.'));

        if (result.success) {
            await loadCampaigns();
        }
    };

    const handleToggle = (campaign: Campaign) => {
        startTransition(async () => {
            const result = await toggleCampaignStatus(campaign.id, !campaign.is_active);
            setMessage(result.success ? 'Durum güncellendi.' : result.message || 'Durum güncellenemedi.');
            if (result.success) {
                await loadCampaigns();
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;

        startTransition(async () => {
            const result = await deleteCampaign(id);
            setMessage(result.success ? 'Kampanya silindi.' : result.message || 'Silme işlemi başarısız.');
            if (result.success) {
                await loadCampaigns();
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-base font-semibold text-gray-900">Yeni Kampanya Oluştur</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Kod alanı boş bırakılırsa kampanya adına göre otomatik üretilir.
                </p>

                <form action={handleCreate} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                        name="name"
                        required
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        placeholder="Kampanya adı"
                    />
                    <input
                        name="campaignCode"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        placeholder="Kampanya kodu (opsiyonel)"
                    />
                    <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800">
                        <input type="checkbox" name="isActive" defaultChecked />
                        Başlangıçta aktif
                    </label>
                    <div className="md:col-span-3">
                        <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Kampanya Ekle
                        </button>
                    </div>
                </form>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-base font-semibold text-gray-900">Mevcut Kampanyalar</h3>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr className="text-left text-gray-500">
                                <th className="px-3 py-2">Ad</th>
                                <th className="px-3 py-2">Kod</th>
                                <th className="px-3 py-2">Durum</th>
                                <th className="px-3 py-2">Oluşturulma</th>
                                <th className="px-3 py-2 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {campaigns.map((campaign) => (
                                <tr key={campaign.id}>
                                    <td className="px-3 py-2 font-medium text-gray-900">
                                        {campaign.name || campaign.title || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{campaign.campaign_code || '-'}</td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {campaign.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">
                                        {campaign.created_at ? new Date(campaign.created_at).toLocaleString('tr-TR') : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                disabled={isPending}
                                                onClick={() => handleToggle(campaign)}
                                                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                            >
                                                {campaign.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                                            </button>
                                            <button
                                                disabled={isPending}
                                                onClick={() => handleDelete(campaign.id)}
                                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {campaigns.length === 0 && (
                    <p className="mt-3 text-sm text-gray-500">Henüz kampanya bulunmuyor.</p>
                )}
            </div>

            {message && (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                    {message}
                </div>
            )}
        </div>
    );
}
