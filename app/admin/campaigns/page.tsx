'use client';

import { useState, useEffect } from 'react';
import { getCampaigns, toggleCampaignStatus, createCampaign } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import clsx from 'clsx';
import Link from 'next/link';

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        setIsLoading(true);
        const data = await getCampaigns();
        setCampaigns(data);
        setIsLoading(false);
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const res = await toggleCampaignStatus(id, !currentStatus);
        if (res.success) {
            toast.success('Durum güncellendi');
            loadCampaigns();
        } else {
            toast.error('Hata: ' + res.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Kampanyalar</h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-[#002855] text-white px-4 py-2 rounded-lg hover:bg-[#003366] transition-colors"
                >
                    + Yeni Kampanya
                </button>
            </div>

            {/* Create Campaign Modal (Simple) */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Yeni Kampanya Oluştur</h3>
                        <form action={async (formData) => {
                            const res = await createCampaign(null, formData);
                            if (res.success) {
                                toast.success(res.message);
                                setIsCreating(false);
                                loadCampaigns();
                            } else {
                                toast.error(res.message);
                            }
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kampanya Adı</label>
                                    <input name="name" required className="w-full border rounded px-3 py-2" placeholder="Örn: Yaz Fırsatları" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kampanya Kodu (Opsiyonel)</label>
                                    <input name="campaignCode" className="w-full border rounded px-3 py-2" placeholder="Otomatik oluşturulur" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" name="isActive" id="isActive" className="w-4 h-4" />
                                    <label htmlFor="isActive" className="text-sm text-gray-700">Aktif Olarak Oluştur</label>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">İptal</button>
                                    <button type="submit" className="px-4 py-2 bg-[#002855] text-white rounded hover:bg-[#003366]">Oluştur</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Campaign List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad / Kod</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug (Link)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center py-4">Yükleniyor...</td></tr>
                        ) : campaigns.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">Henüz kampanya yok.</td></tr>
                        ) : (
                            campaigns.map((camp) => (
                                <tr key={camp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleStatus(camp.id, camp.is_active)}
                                            className={clsx(
                                                "px-2 py-1 text-xs font-semibold rounded-full w-20 text-center transition-colors",
                                                camp.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                            )}
                                        >
                                            {camp.is_active ? 'Aktif' : 'Pasif'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{camp.name || camp.title}</div>
                                        <div className="text-xs text-gray-500">{camp.campaign_code}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {camp.slug ? (
                                            <Link href={`/kampanya/${camp.slug}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                                                /{camp.slug}
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(camp.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            href={`/admin/campaigns/${camp.id}`}
                                            className="text-[#002855] hover:text-[#003366] font-semibold"
                                        >
                                            Düzenle &rarr;
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
