import { getCampaignBySlug } from '../actions';
import DynamicForm from '@/components/DynamicForm';
import { notFound } from 'next/navigation';
import Image from 'next/image';

// We should use generateMetadata for dynamic SEO tags

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const campaign = await getCampaignBySlug(params.slug);
    if (!campaign) return { title: 'Kampanya Bulunamadı' };
    return {
        title: campaign.name || campaign.title || 'Kampanya',
        description: campaign.description || 'Kampanya detayları ve başvuru formu.'
    };
}

export default async function CampaignPage({ params }: { params: { slug: string } }) {
    const campaign = await getCampaignBySlug(params.slug);

    if (!campaign) {
        notFound();
    }

    const { page_content, form_schema } = campaign;
    const content = page_content || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Custom Navbar / Header could go here */}

            {/* Hero Section / Banner */}
            <div className="relative bg-[#002855] text-white">
                {content.bannerImage && (
                    <div className="absolute inset-0 z-0 opacity-20">
                        {/* Placeholder or real image if configured */}
                        <Image
                            src={content.bannerImage}
                            alt="Banner"
                            fill
                            className="object-cover"
                        />
                    </div>
                )}
                <div className="relative z-10 container mx-auto px-4 py-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {content.heroTitle || campaign.name}
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
                        {content.heroSubtitle || campaign.description}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column: Content / Features */}
                    <div className="lg:col-span-2 space-y-8">
                        {content.features && Array.isArray(content.features) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {content.features.map((feature: any, idx: number) => (
                                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="text-xl font-semibold text-[#002855] mb-2">{feature.title}</h3>
                                        <p className="text-gray-600">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {content.longDescription && (
                            <div className="prose max-w-none bg-white p-8 rounded-xl shadow-sm">
                                <div dangerouslySetInnerHTML={{ __html: content.longDescription }} />
                            </div>
                        )}
                    </div>

                    {/* Right Column: Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-[#002855] sticky top-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Başvuru Formu</h2>
                            {form_schema && form_schema.length > 0 ? (
                                <DynamicForm
                                    schema={form_schema}
                                    campaignId={campaign.id}
                                    campaignSlug={campaign.slug}
                                />
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    Bu kampanya için aktif bir form bulunmamaktadır.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
