'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import Icon from '@/components/theme/Icon';

interface DashboardFilterProps {
    campaigns: { id: string; name: string; title?: string }[];
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({ campaigns }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedCampaignId = searchParams.get('campaignId');

    const handleFilter = (id: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id) {
            params.set('campaignId', id);
        } else {
            params.delete('campaignId');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => handleFilter(null)}
                    className={twMerge(
                        'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                        !selectedCampaignId
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                >
                    Tüm Başvurular
                </button>
                {campaigns.map(c => (
                    <button
                        key={c.id}
                        onClick={() => handleFilter(c.id)}
                        className={twMerge(
                            'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                            selectedCampaignId === c.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}
                    >
                        {c.title || c.name}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-3 text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Icon name="filter_list" size="sm" />
                <span className="text-xs font-medium uppercase tracking-widest">Sırala:</span>
                <select className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-300 outline-none">
                    <option>En Yeni</option>
                    <option>Popüler</option>
                    <option>Süresi Azalanlar</option>
                </select>
            </div>
        </div>
    );
};

export default DashboardFilter;
