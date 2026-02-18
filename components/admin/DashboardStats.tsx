'use client';

import React from 'react';
import Icon from '@/components/theme/Icon';
import Card from '@/components/theme/Card';
import { Stats } from '@/types';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: { value: string; positive: boolean };
    variant?: 'sparkline' | 'bar' | 'progress' | 'default';
    progressValue?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, trend, variant = 'default', progressValue }) => {
    return (
        <Card variant="stat" padding="md" className="group">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Icon name={icon} className="text-primary" />
                </div>
                {trend && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        trend.positive
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                    }`}>
                        <Icon name={trend.positive ? 'arrow_upward' : 'arrow_downward'} size="xs" />
                        {trend.value}
                    </span>
                )}
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{title}</div>

            {variant === 'bar' && (
                <div className="flex gap-1 items-end h-10 mt-4">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all ${i === 5 ? 'bg-primary' : 'bg-primary/20'}`}
                            style={{ height: `${h}%` }}
                        />
                    ))}
                </div>
            )}

            {variant === 'progress' && progressValue !== undefined && (
                <div className="mt-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressValue}%` }}
                        />
                    </div>
                    <div className="text-right text-[10px] font-bold text-primary mt-1">{progressValue}%</div>
                </div>
            )}

            {variant === 'sparkline' && (
                <div className="mt-4">
                    <svg className="w-full h-10" viewBox="0 0 200 40" preserveAspectRatio="none">
                        <path
                            d="M0 35 L30 25 L60 30 L90 15 L120 20 L150 8 L180 12 L200 5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-primary"
                        />
                        <path
                            d="M0 35 L30 25 L60 30 L90 15 L120 20 L150 8 L180 12 L200 5 L200 40 L0 40Z"
                            fill="currentColor"
                            className="text-primary/10"
                        />
                    </svg>
                </div>
            )}
        </Card>
    );
};

interface DashboardStatsProps {
    stats: Stats;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
                title="Toplam Başvuru"
                value={stats.totalApplications}
                icon="description"
                trend={{ value: '%12', positive: true }}
                variant="sparkline"
            />
            <KpiCard
                title="Bekleyen"
                value={stats.pendingReviews}
                icon="schedule"
                variant="bar"
            />
            <KpiCard
                title="Aktif Kampanya"
                value={stats.activeCampaigns}
                icon="campaign"
                variant="default"
            />
            <KpiCard
                title="Günlük Ziyaret"
                value={stats.dailyRequests}
                icon="trending_up"
                trend={{ value: '%5', positive: true }}
                variant="progress"
                progressValue={72}
            />
        </div>
    );
};

export { KpiCard };
export default DashboardStats;
