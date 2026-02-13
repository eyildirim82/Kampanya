import { getCampaigns } from '../actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CampaignListClient from './campaign-list-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token');
    if (!token) redirect('/admin/login');

    const campaigns = await getCampaigns();

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-[#002855]">
                        Kampanya Yönetimi
                    </h1>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/admin/dashboard"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            ← Dashboard
                        </Link>
                        <Link
                            href="/admin/campaigns/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#002855] hover:bg-[#003a75] transition-colors"
                        >
                            + Yeni Kampanya
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CampaignListClient campaigns={campaigns} />
                </div>
            </main>
        </div>
    );
}
