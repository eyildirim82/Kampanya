
import { notFound } from 'next/navigation';
import { getCampaignBySlug } from '@/app/actions';
import DynamicForm from '@/components/DynamicForm';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
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

    const content = campaign.page_content || {};
    const schema = campaign.form_schema || [];

    const heroTitle = content.heroTitle || campaign.title || campaign.name || 'Kampanya Detayı';
    const heroSubtitle = content.heroSubtitle;
    const bannerImage = content.bannerImage; // Optional banner
    const longDescription = content.longDescription; // HTML
    const features = content.features || []; // Array of {title, description}

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <div className={`relative bg-[#002855] text-white ${bannerImage ? 'h-64' : 'py-16'} flex items-center justify-center`}>
                {bannerImage && (
                    <>
                        <img
                            src={bannerImage}
                            alt={heroTitle}
                            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#002855] to-transparent"></div>
                    </>
                )}

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-md">
                        {heroTitle}
                    </h1>
                    {heroSubtitle && (
                        <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto drop-shadow">
                            {heroSubtitle}
                        </p>
                    )}
                </div>
            </div>

            <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-8 mb-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left/Top Column: Description & Features */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description Card */}
                        {(longDescription || features.length > 0) && (
                            <div className="bg-white rounded-xl shadow-lg p-8">
                                {longDescription && (
                                    <div
                                        className="prose prose-blue max-w-none mb-8 text-gray-600"
                                        dangerouslySetInnerHTML={{ __html: longDescription }}
                                    />
                                )}

                                {/* Features Grid */}
                                {features.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {features.map((feature: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                <h3 className="font-semibold text-[#002855] mb-1">{feature.title}</h3>
                                                <p className="text-sm text-gray-600">{feature.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* If no description/features, generic placeholder or empty */}
                        {(!longDescription && features.length === 0) && (
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
                                Kampanya detayları formun sağ tarafındadır.
                            </div>
                        )}
                    </div>

                    {/* Right/Bottom Column: Application Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 sticky top-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
                                Başvuru Formu
                            </h2>

                            {schema.length > 0 ? (
                                <DynamicForm
                                    schema={schema}
                                    campaignId={campaign.id}
                                />
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    Bu kampanya için form tanımlanmamış.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500 text-sm mt-auto">
                <p>&copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği</p>
            </footer>
        </div>
    );
}
