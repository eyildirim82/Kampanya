'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/theme/Icon';
import { Interest, Campaign } from '@/types';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Alert from '@/components/theme/Alert';
import { deleteInterest } from '@/app/admin/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface InterestTableProps {
    initialInterests: Interest[];
    campaigns: Campaign[];
}

const InterestTable: React.FC<InterestTableProps> = ({ initialInterests, campaigns }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedCampaignId = searchParams.get('campaignId') || 'all';

    const [interests, setInterests] = useState<Interest[]>(initialInterests);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Sync state if props change (re-validation)
    React.useEffect(() => {
        setInterests(initialInterests);
    }, [initialInterests]);

    const handleCampaignChange = (campaignId: string) => {
        setLoading(true);
        if (campaignId === 'all') {
            router.push('/admin/interests');
        } else {
            router.push(`/admin/interests?campaignId=${campaignId}`);
        }
        // setLoading will remain true until page reload finishes, effectively.
        // Ideally we use transition, but this is simple.
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;

        // Optimistic update
        setInterests(prev => prev.filter(i => i.id !== id));

        const result = await deleteInterest(id);
        if (!result.success) {
            alert(result.message);
            router.refresh(); // Revert if failed
        }
    };

    const filteredInterests = interests.filter(item =>
        (item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tckn && item.tckn.includes(searchTerm))
    );

    const handleExportCSV = () => {
        const headers = ['Tarih', 'Kampanya', 'Ad Soyad', 'E-posta', 'Telefon', 'TCKN', 'Not'];
        const rows = filteredInterests.map(item => [
            item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : '-',
            item.campaignName || '-',
            item.fullName,
            item.email,
            item.phone,
            item.tckn || '-',
            item.note ? `"${item.note.replace(/"/g, '""')}"` : '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.join(';'), ...rows.map(e => e.join(";"))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `talepler_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Talep Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Kampanyalar için oluşturulan ön talepleri yönetin.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleExportCSV} leftIcon={<Icon name="download" size="sm" />}>
                        Excel (CSV)
                    </Button>
                    {/* PDF export not implemented in source either really */}
                </div>
            </div>

            <Card className="shadow-sm border border-slate-200" padding="sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Icon name="search" size="sm" className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="İsim, E-posta veya TCKN ile ara..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-72">
                        <div className="relative">
                            <Icon name="filter_list" size="sm" className="absolute left-3 top-2.5 text-slate-400" />
                            <select
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-white outline-none cursor-pointer"
                                value={selectedCampaignId}
                                onChange={(e) => handleCampaignChange(e.target.value)}
                            >
                                <option value="all">Tüm Kampanyalar</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.title || c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden border border-slate-200 shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kişi Bilgisi</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">İletişim</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kampanya</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Not</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredInterests.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredInterests.map((interest) => (
                                    <tr key={interest.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-900">{interest.fullName}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{interest.tckn}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="mail" size="xs" className="text-slate-400" />
                                                <span>{interest.email}</span>
                                            </div>
                                            {interest.phone && (
                                                <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                    <Icon name="phone" size="xs" className="text-slate-400" />
                                                    <span>{interest.phone}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-talpa-navy">
                                            {interest.campaignName || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={interest.note}>
                                            {interest.note ? (
                                                <span className="italic">"{interest.note}"</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Icon name="calendar_today" size="xs" className="text-slate-400" />
                                                {interest.createdAt ? format(new Date(interest.createdAt), 'd MMM yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 pl-4.5">
                                                {interest.createdAt ? format(new Date(interest.createdAt), 'HH:mm') : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(interest.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Sil"
                                            >
                                                <Icon name="delete" size="sm" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredInterests.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
                        <span>Toplam {filteredInterests.length} kayıt gösteriliyor</span>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default InterestTable;
