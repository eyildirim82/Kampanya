import { getApplications, getCampaigns, getDashboardStats, getCampaignStats, adminLogout } from '../actions';
import ApplicationTable from '../components/ApplicationTable';
import DashboardStats from '../components/DashboardStats';
import CampaignStats from '../components/CampaignStats';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Basic session check via cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token');

    if (!token) {
        redirect('/admin/login');
    }

    const { campaignId, page } = await searchParams;
    const validCampaignId = typeof campaignId === 'string' ? campaignId : undefined;
    const currentPage = typeof page === 'string' ? parseInt(page) : 1;

    const [result, allCampaigns, stats, campaignStats] = await Promise.all([
        getApplications(validCampaignId, currentPage),
        getCampaigns(),
        getDashboardStats(),
        getCampaignStats()
    ]);

    const { data: applications, count } = result;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-[#002855]">
                        Yönetim Paneli
                    </h1>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/admin/campaigns"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Kampanyalar
                        </Link>
                        <Link
                            href="/admin/interests"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Talepler
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Ayarlar
                        </Link>
                        <Link
                            href="/admin/whitelist"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Whitelist Yönetimi
                        </Link>
                        <Link
                            href="/admin/fields"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Alan Kütüphanesi
                        </Link>
                        <form action={adminLogout}>
                            <button
                                type="submit"
                                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                            >
                                Çıkış Yap
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

                    {/* Analytics Cards */}
                    <DashboardStats stats={stats} />

                    {/* Campaign Stats Report (Only show if no specific campaign selected, or always? specific usually focused. Let's show always for overview or just when Home) */}
                    {!validCampaignId && (
                        <CampaignStats stats={campaignStats} />
                    )}

                    {/* Campaign Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
                            <a
                                href="/admin/dashboard"
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${!validCampaignId
                                        ? 'border-[#002855] text-[#002855]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                Tümü
                            </a>
                            {allCampaigns.map((campaign) => (
                                <a
                                    key={campaign.id}
                                    href={`/admin/dashboard?campaignId=${campaign.id}`}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                        ${validCampaignId === campaign.id
                                            ? 'border-[#002855] text-[#002855]'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                    `}
                                >
                                    {campaign.name || campaign.title}
                                </a>
                            ))}
                        </nav>
                    </div>

                    <div className="px-4 py-4 sm:px-0 space-y-4">
                        <ApplicationTable
                            applications={applications}
                            totalCount={count}
                            currentPage={currentPage}
                            campaignId={validCampaignId}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

