'use client';

import { Users, FileText, CheckCircle, Clock } from 'lucide-react';

interface DashboardStatsProps {
    stats: {
        totalApplications: number;
        activeCampaigns: number;
        totalInterests: number;
        pendingReviews: number;
    };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
    const cards = [
        {
            label: 'Toplam Başvuru',
            value: stats.totalApplications,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200'
        },
        {
            label: 'Bekleyen Onay',
            value: stats.pendingReviews,
            icon: Clock,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-200'
        },
        {
            label: 'Aktif Kampanya',
            value: stats.activeCampaigns,
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-200'
        },
        {
            label: 'Ön Talepler',
            value: stats.totalInterests,
            icon: FileText,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-200'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`bg-white rounded-xl shadow-sm border ${card.border} p-5 flex items-center justify-between transition-transform hover:scale-[1.02]`}
                >
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.bg}`}>
                        <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}
