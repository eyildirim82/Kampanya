import { notFound } from 'next/navigation';
import { getCampaignBySlug } from '@/app/actions';
import InterestForm from './form';

export const dynamic = 'force-dynamic';

export default async function InterestPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Fetch campaign data
    const campaign = await getCampaignBySlug(slug);

    if (!campaign || !campaign.is_active) {
        notFound();
    }

    const heroTitle = campaign.name || 'Talep Formu';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <div className="relative bg-talpa-navy text-white py-16 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-talpa-navy to-transparent opacity-80"></div>

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-md">
                        {heroTitle}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto drop-shadow">
                        Bu kampanya için ön talep oluşturarak ilginizi belirtebilirsiniz.
                    </p>
                </div>
            </div>

            <main className="flex-grow max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-8 mb-20 relative z-20">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-4 mb-4">
                            Talep Formu
                        </h2>
                        <p className="text-gray-700 text-sm">
                            Aşağıdaki formu doldurarak kampanya hakkında bilgi almak istediğinizi bize iletebilirsiniz.
                        </p>
                    </div>

                    <InterestForm campaignId={campaign.id} />
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-700 text-sm mt-auto">
                <p>&copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği</p>
            </footer>
        </div>
    );
}
