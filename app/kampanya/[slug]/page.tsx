import { notFound } from 'next/navigation';
import { getCampaignBySlug } from '@/app/actions';
import CampaignFormWrapper from './CampaignFormWrapper';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

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
        <div key={slug} className="min-h-screen bg-talpa-bg flex flex-col">
            {/* Hero Section */}
            <div className={`relative bg-talpa-bg text-white ${bannerImage ? 'h-80' : 'py-24'} flex items-center justify-center overflow-hidden`
            }>
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-radar opacity-20 animate-radar-sweep"></div>

                {
                    bannerImage && (
                        <>
                            <img
                                src={bannerImage}
                                alt={heroTitle}
                                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-talpa-bg via-talpa-bg/60 to-transparent"></div>
                        </>
                    )
                }

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-talpa-accent text-xs font-mono tracking-widest uppercase mb-2">
                        <span className="w-2 h-2 rounded-full bg-deniz-red animate-pulse"></span>
                        Kampanya Detayı
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-2xl">
                        {heroTitle}
                    </h1>
                    {heroSubtitle && (
                        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto drop-shadow font-light leading-relaxed">
                            {heroSubtitle}
                        </p>
                    )}
                </div>
            </div >

            <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-10 mb-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left/Top Column: Description & Features */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description Card */}
                        {(longDescription || features.length > 0) && (
                            <div className="bg-white rounded-2xl shadow-xl shadow-talpa-navy/5 border border-slate-100 p-8 animate-fade-in-up stagger-1">
                                {longDescription && (
                                    <div
                                        className="prose prose-slate prose-headings:text-talpa-navy prose-a:text-talpa-blue-600 max-w-none mb-8 text-slate-600 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: longDescription }}
                                    />
                                )}

                                {/* Features Grid */}
                                {features.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {features.map((feature: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100/50 hover:border-talpa-blue-200 transition-colors group">
                                                <h3 className="font-bold text-talpa-navy mb-2 group-hover:text-deniz-red transition-colors">{feature.title}</h3>
                                                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* If no description/features, generic placeholder or empty */}
                        {(!longDescription && features.length === 0) && (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-slate-500 animate-fade-in-up">
                                Kampanya detayları formun sağ tarafındadır.
                            </div>
                        )}
                    </div>

                    {/* Right/Bottom Column: Application Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-2xl shadow-talpa-navy/10 border border-slate-100 p-6 sticky top-24 animate-fade-in-up stagger-2">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 rounded-full bg-talpa-bg/5 flex items-center justify-center text-talpa-navy">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-talpa-navy leading-none">Başvuru Formu</h2>
                                    <p className="text-xs text-slate-400 mt-1">Lütfen bilgilerinizi eksiksiz doldurunuz.</p>
                                </div>
                            </div>

                            {schema.length > 0 ? (
                                <CampaignFormWrapper
                                    campaignId={campaign.id}
                                    schema={schema}
                                />
                            ) : (
                                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    Bu kampanya için form tanımlanmamış.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <footer className="bg-white border-t border-slate-100 py-8 text-center text-slate-400 text-sm mt-auto">
                <p>&copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği</p>
            </footer>
        </div>
    );
}

