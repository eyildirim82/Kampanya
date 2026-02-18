
import React, { Suspense } from 'react';
import Icon from '@/components/theme/Icon';
import Card from '@/components/theme/Card';
import DashboardStats from '@/components/admin/DashboardStats';
import DashboardChart from '@/components/admin/DashboardChart';
import ApplicationTable from '@/components/admin/ApplicationTable';
import DashboardFilter from '@/components/admin/DashboardFilter';
import { getAdminStats, getAdminChartData, getActiveCampaignsForFilter } from './dashboard/actions';
import { getApplications } from './actions';
import { Application } from '@/types';

// Next.js 15+ Page Props Type
type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminDashboardPage(props: Props) {
    const searchParams = await props.searchParams;
    const campaignId = typeof searchParams.campaignId === 'string' ? searchParams.campaignId : undefined;

    // Fetch data in parallel
    const [stats, chartData, campaigns, applicationsResult] = await Promise.all([
        getAdminStats(),
        getAdminChartData(),
        getActiveCampaignsForFilter(),
        getApplications(campaignId) // Assuming getApplications supports filtering by ID
    ]);

    const applications = (applicationsResult.data || []) as Application[];

    return (
        <div className="space-y-8">
            {/* Stats */}
            <DashboardStats stats={stats} />

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="md:col-span-2 lg:col-span-2">
                    <DashboardChart data={chartData} />
                </div>

                {/* Quick Actions */}
                <div className="md:col-span-1 lg:col-span-1">
                    <Card className="h-full bg-gradient-to-br from-talpa-navy via-talpa-navy/70 to-talpa-bg text-white border-none shadow-xl relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl"></div>

                        <div className="relative z-10 h-full flex flex-col">
                            <h3 className="text-lg font-bold mb-1">Hızlı Erişim</h3>
                            <p className="text-blue-200 text-sm mb-6">Sık kullanılan işlemler.</p>

                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/5 backdrop-blur-sm group text-left hover:scale-[1.02] active:scale-[0.98]">
                                    <span className="font-medium">Kampanya Oluştur</span>
                                    <Icon name="chevron_right" size="sm" className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/5 backdrop-blur-sm group text-left hover:scale-[1.02] active:scale-[0.98]">
                                    <span className="font-medium">Rapor İndir (Excel)</span>
                                    <Icon name="chevron_right" size="sm" className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/5 backdrop-blur-sm group text-left hover:scale-[1.02] active:scale-[0.98]">
                                    <span className="font-medium">Sistem Logları</span>
                                    <Icon name="chevron_right" size="sm" className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Campaign Filter Tabs */}
            <DashboardFilter campaigns={campaigns} />

            {/* Table */}
            <div className="min-h-[200px]">
                <ApplicationTable applications={applications || []} loading={false} />
            </div>
        </div>
    );
}
