'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/theme/Card';
import Icon from '@/components/theme/Icon';

interface DashboardChartProps {
    data: { name: string; basvuru: number }[];
}

interface InstitutionReachItem {
    name: string;
    initials: string;
    count: number;
    percentage: number;
}

interface InstitutionReachListProps {
    institutions?: InstitutionReachItem[];
}

export const InstitutionReachList: React.FC<InstitutionReachListProps> = ({ institutions }) => {
    const defaultInstitutions: InstitutionReachItem[] = [
        { name: 'DenizBank', initials: 'DB', count: 4280, percentage: 85 },
        { name: 'Allianz', initials: 'AL', count: 3150, percentage: 65 },
        { name: 'Shell', initials: 'SH', count: 2800, percentage: 55 },
        { name: 'Garanti', initials: 'GB', count: 1920, percentage: 40 },
    ];

    const items = institutions || defaultInstitutions;

    return (
        <Card padding="md" className="h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Kurum Erişimi</h3>
                <a href="#" className="text-xs text-primary font-medium hover:underline">Tümünü Gör</a>
            </div>
            <div className="space-y-5">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {item.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                                <span className="text-xs text-slate-500">{item.count.toLocaleString('tr-TR')}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const DashboardChart: React.FC<DashboardChartProps> = ({ data }) => {
    return (
        <Card padding="md" className="h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Büyüme Trendleri</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Günlük başvuru dağılımı</p>
                </div>
                <select className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg py-1 pl-2 pr-8 focus:ring-primary text-slate-600 dark:text-slate-300 font-medium">
                    <option>Son 7 Gün</option>
                    <option>Bu Ay</option>
                    <option>Bu Yıl</option>
                </select>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBasvuru" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1152d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1152d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            cursor={{ fill: '#f1f5f9' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="basvuru"
                            stroke="#1152d4"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorBasvuru)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default DashboardChart;
