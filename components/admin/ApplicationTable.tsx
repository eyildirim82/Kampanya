'use client';

import React, { useState } from 'react';
import Card from '@/components/theme/Card';
import { StatusBadge } from '@/components/theme/Badge';
import Button from '@/components/theme/Button';
import Icon from '@/components/theme/Icon';
import SearchInput from '@/components/theme/SearchInput';
import { Application } from '@/types';

interface ApplicationTableProps {
    applications: Application[];
    loading?: boolean;
}

const ApplicationTable: React.FC<ApplicationTableProps> = ({ applications, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredApps = applications.filter(app =>
        (app.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (app.campaignId?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    );

    const getStatusKey = (status: string): 'approved' | 'pending' | 'rejected' | 'waiting' => {
        const map: Record<string, 'approved' | 'pending' | 'rejected' | 'waiting'> = {
            'APPROVED': 'approved',
            'PENDING': 'pending',
            'REJECTED': 'rejected',
            'WAITING': 'waiting',
        };
        return map[status] || 'pending';
    };

    return (
        <Card padding="none" className="overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Başvurular</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tüm kampanya başvurularını yönetin</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="İsim veya kampanya ara..."
                        className="flex-1 md:w-64"
                    />
                    <Button variant="outline" size="sm" icon="download">
                        Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Referans</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">İsim Soyisim</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">TCKN</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tarih</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Durum</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <Icon name="progress_activity" className="animate-spin mx-auto mb-2" />
                                    Yükleniyor...
                                </td>
                            </tr>
                        ) : filteredApps.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <Icon name="inbox" className="mx-auto mb-2 text-slate-300" size="lg" />
                                    Kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filteredApps.map((app) => (
                                <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                            #{app.id.substring(0, 8)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {app.applicantName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white">{app.applicantName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{app.tckn}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(app.appliedAt).toLocaleDateString('tr-TR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={getStatusKey(app.status)} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Detay">
                                                <Icon name="visibility" size="sm" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Düzenle">
                                                <Icon name="edit" size="sm" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                                                <Icon name="delete" size="sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && filteredApps.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Toplam {filteredApps.length} kayıt</span>
                    <div className="flex gap-1">
                        <button className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors" disabled>Önceki</button>
                        <button className="px-2.5 py-1 rounded-lg bg-primary text-white shadow-sm">1</button>
                        <button className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">2</button>
                        <button className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Sonraki</button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default ApplicationTable;
