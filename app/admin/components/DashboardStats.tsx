'use client';

import Icon from '@/components/theme/Icon';
import { Card, CardHeader } from '@/components/theme/Card';

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
            icon: 'group',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
        },
        {
            label: 'Bekleyen Onay',
            value: stats.pendingReviews,
            icon: 'schedule',
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
        },
        {
            label: 'Aktif Kampanya',
            value: stats.activeCampaigns,
            icon: 'check_circle',
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-200',
        },
        {
            label: 'Ön Talepler',
            value: stats.totalInterests,
            icon: 'description',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, index) => (
                <Card
                    key={index}
                    variant="default"
                    padding="md"
                    className={`flex flex-row items-center justify-between transition-transform hover:scale-[1.02] border-l-4 ${card.border}`}
                >
                    <CardHeader
                        title={String(card.value)}
                        subtitle={card.label}
                        className="mb-0"
                    />
                    <div className={`p-3 rounded-full shrink-0 ${card.bg}`}>
                        <Icon name={card.icon} size="md" className={card.color} />
                    </div>
                </Card>
            ))}
        </div>
    );
}
