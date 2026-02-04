import { getApplications, getCampaigns, adminLogout } from '../actions';
import ApplicationTable from '../components/ApplicationTable';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

    const { campaignId } = await searchParams;
    const validCampaignId = typeof campaignId === 'string' ? campaignId : undefined;

    const [applications] = await Promise.all([
        getApplications(validCampaignId),
    ]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-[#002855]">
                        Yönetim Paneli
                    </h1>
                    <div className="flex items-center space-x-4">
                        <a
                            href="/admin/settings"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Ayarlar
                        </a>
                        <a
                            href="/admin/whitelist"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Whitelist Yönetimi
                        </a>
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
                    <div className="px-4 py-4 sm:px-0 space-y-4">
                        {/* Removed CampaignSelector */}
                        <ApplicationTable applications={applications} />
                    </div>
                </div>
            </main>
        </div>
    );
}
