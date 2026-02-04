'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type Campaign = {
    id: string;
    name: string;
    is_active: boolean;
};

export default function CampaignSelector({ campaigns }: { campaigns: Campaign[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCampaignId = searchParams.get('campaignId') || 'all';
    const [isPending, startTransition] = useTransition();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams);
        if (value === 'all') {
            params.delete('campaignId');
        } else {
            params.set('campaignId', value);
        }

        startTransition(() => {
            router.replace(`?${params.toString()}`);
            router.refresh();
        });
    };

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor="campaign-select" className="text-sm font-medium text-gray-700">
                Kampanya:
            </label>
            <div className="relative">
                <select
                    id="campaign-select"
                    value={currentCampaignId}
                    onChange={handleChange}
                    disabled={isPending}
                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white border shadow-sm"
                >
                    <option value="all">Tüm Başvurular</option>
                    {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                            {campaign.name} {campaign.is_active ? '(Aktif)' : '(Pasif)'}
                        </option>
                    ))}
                </select>
                {isPending && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-8 pointer-events-none">
                        <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
