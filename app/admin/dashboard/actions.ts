'use server';

import { getSupabaseClient } from '@/lib/supabase-client';
import { Stats } from '@/types';

// Helper to get authenticated client (simplified version of admin/actions.ts helper)
// In a real scenario, we should reuse the auth logic or middleware protection.
// For now assuming middleware protects /admin routes.

export async function getAdminStats(): Promise<Stats> {
    const supabase = getSupabaseClient();

    // 1. Total Applications
    const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

    // 2. Pending Reviews (Status = PENDING or WAITING)
    const { count: pendingReviews } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'WAITING']);

    // 3. Active Campaigns
    const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('status', 'active'); // Assuming 'status' column exists or we rely on is_active

    // 4. Daily Requests (Applications created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: dailyRequests } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

    return {
        totalApplications: totalApplications || 0,
        pendingReviews: pendingReviews || 0,
        activeCampaigns: activeCampaigns || 0,
        dailyRequests: dailyRequests || 0
    };
}

export async function getAdminChartData() {
    const supabase = getSupabaseClient();

    // Get last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    // In a real production app, use a database function (RPC) for this aggregation
    // For now, we'll fetch last 7 days data and aggregate in JS (not efficient for huge data)

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data } = await supabase
        .from('applications')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

    // Aggregate
    const counts: Record<string, number> = {};
    dates.forEach(d => counts[d] = 0);

    data?.forEach(app => {
        const dateKey = new Date(app.created_at).toISOString().split('T')[0];
        if (counts[dateKey] !== undefined) {
            counts[dateKey]++;
        }
    });

    return dates.map(date => ({
        name: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        basvuru: counts[date]
    }));
}

export async function getActiveCampaignsForFilter() {
    const supabase = getSupabaseClient();
    const { data } = await supabase
        .from('campaigns')
        .select('id, name, title')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return data || [];
}
