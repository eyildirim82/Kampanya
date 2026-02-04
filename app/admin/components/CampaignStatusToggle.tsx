'use client';

import { useState, useTransition } from 'react';
import { toggleCampaignStatus } from '../actions';
import { useRouter } from 'next/navigation';

export default function CampaignStatusToggle({ id, isActive }: { id: string, isActive: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleToggle = async () => {
        startTransition(async () => {
            const res = await toggleCampaignStatus(id, !isActive);
            if (res.success) {
                router.refresh(); // Refresh server component to show updated list
            } else {
                alert('Durum güncellenemedi: ' + res.message);
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={`
                relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}
            `}
        >
            <span className="sr-only">Durumu Değiştir</span>
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                    ${isActive ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
