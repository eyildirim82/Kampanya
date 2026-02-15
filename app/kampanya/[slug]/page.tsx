
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCampaignBySlug } from '@/app/actions';
import CampaignFormWrapper from './CampaignFormWrapper';
import CreditForm from './CreditForm';
import { Card } from '@/components/ui/Card';

const CREDIT_CAMPAIGN_CODE =
    process.env.NEXT_PUBLIC_CREDIT_CAMPAIGN_CODE || 'CREDIT_2026';

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

    const isCreditCampaign =
        (campaign.campaign_code || '') === CREDIT_CAMPAIGN_CODE;

    if (isCreditCampaign) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 fade-in">
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight text-[#002855]">
                            DenizBank & TALPA
                            <br />
                            <span className="text-xl md:text-2xl font-normal text-gray-600">
                                Özel İhtiyaç Kredisi Fırsatı
                            </span>
                        </h1>
                        <div className="flex justify-center mb-8">
                            <div className="bg-red-600 text-white font-bold text-4xl px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
                                %3,35
                                <span className="block text-sm font-normal opacity-90 mt-1">Faiz Oranı</span>
                            </div>
                        </div>
                        <p className="mt-4 text-base text-gray-700 max-w-3xl mx-auto leading-relaxed">
                            TALPA üyelerine özel, <strong>3.35%</strong> avantajlı faiz oranı ve <strong>12 ay</strong> vade ile ihtiyaç kredisi fırsatı.
                            Üst limit <strong>5,000,000 TL</strong>&apos;dir.
                        </p>
                    </div>

                    <Card className="mb-10 overflow-hidden shadow-xl border-0" padding="none">
                        <div className="bg-[#002855] px-6 py-4">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Örnek Ödeme Tablosu
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center">
                                <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Kredi Tutarı</th>
                                        <th className="px-4 py-3 border-b">Vade</th>
                                        <th className="px-4 py-3 border-b">Faiz (%)</th>
                                        <th className="px-4 py-3 border-b">Aylık Taksit</th>
                                        <th className="px-4 py-3 border-b">Tahsis Ücreti</th>
                                        <th className="px-4 py-3 border-b">Sigorta+Vergi Dahil</th>
                                        <th className="px-4 py-3 border-b">Aylık Maliyet</th>
                                        <th className="px-4 py-3 border-b">Yıllık Maliyet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    <tr className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-[#002855]">1,000,000 TL</td>
                                        <td className="px-4 py-3">12 Ay</td>
                                        <td className="px-4 py-3 font-bold text-red-600">3.35</td>
                                        <td className="px-4 py-3">108,758.44 TL</td>
                                        <td className="px-4 py-3">5,000.00 TL</td>
                                        <td className="px-4 py-3">33,965.12 TL</td>
                                        <td className="px-4 py-3">5.7270%</td>
                                        <td className="px-4 py-3">68.7243%</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-[#002855]">2,000,000 TL</td>
                                        <td className="px-4 py-3">12 Ay</td>
                                        <td className="px-4 py-3 font-bold text-red-600">3.35</td>
                                        <td className="px-4 py-3">217,516.89 TL</td>
                                        <td className="px-4 py-3">10,000.00 TL</td>
                                        <td className="px-4 py-3">59,819.12 TL</td>
                                        <td className="px-4 py-3">5.7270%</td>
                                        <td className="px-4 py-3">68.7243%</td>
                                    </tr>
                                    <tr className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-[#002855]">5,000,000 TL</td>
                                        <td className="px-4 py-3">12 Ay</td>
                                        <td className="px-4 py-3 font-bold text-red-600">3.35</td>
                                        <td className="px-4 py-3">543,792.22 TL</td>
                                        <td className="px-4 py-3">25,000.00 TL</td>
                                        <td className="px-4 py-3">137,381.14 TL</td>
                                        <td className="px-4 py-3">5.7270%</td>
                                        <td className="px-4 py-3">68.7243%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 text-[10px] text-gray-500 leading-tight border-t border-gray-100">
                            * Tabloda yer alan kredi tahsis ücretine vergi dahil edilmemiştir. &quot;Sigorta ve vergi dahil ücretler toplamı&quot;, kredi tahsis ücreti, vergi ve sigorta priminden oluşmaktadır. Aylık/yıllık toplam maliyet oranlarına sigorta primi hariç tüm masraf ve vergiler dahil edilmiştir. Örnek kredi için sigorta primi hesaplamalarında ortalama 35 yaş baz alınmıştır. Banka, faiz oranlarında değişiklik yapma, onaylanan kredinin kullanımı için son kararı verme, kefil ve ek belge isteme hakkına sahiptir.
                        </div>
                    </Card>

                    <Suspense fallback={
                        <Card className="flex justify-center items-center p-12">
                            <div className="text-center">
                                <svg className="animate-spin h-10 w-10 text-[#002855] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-500">Kredi başvuru formu yükleniyor...</p>
                            </div>
                        </Card>
                    }>
                        <CreditForm campaignId={campaign.id} />
                    </Suspense>
                </div>
            </div>
        );
    }

    const content = campaign.page_content || {};
    const schema = campaign.form_schema || [];

    const heroTitle = content.heroTitle || campaign.title || campaign.name || 'Kampanya Detayı';
    const heroSubtitle = content.heroSubtitle;
    const bannerImage = content.bannerImage; // Optional banner
    const longDescription = content.longDescription; // HTML
    const features = content.features || []; // Array of {title, description}

    return (
        <div key={slug} className="min-h-screen bg-gray-50 flex flex-col">
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
                        <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto drop-shadow font-medium">
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
                                        className="prose prose-blue max-w-none mb-8 text-gray-800"
                                        dangerouslySetInnerHTML={{ __html: longDescription }}
                                    />
                                )}

                                {/* Features Grid */}
                                {features.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {features.map((feature: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                <h3 className="font-semibold text-[#002855] mb-1">{feature.title}</h3>
                                                <p className="text-sm text-gray-700">{feature.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* If no description/features, generic placeholder or empty */}
                        {(!longDescription && features.length === 0) && (
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-700">
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
                                <CampaignFormWrapper
                                    campaignId={campaign.id}
                                    schema={schema}
                                />
                            ) : (
                                <div className="text-center py-6 text-gray-700">
                                    Bu kampanya için form tanımlanmamış.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-700 text-sm mt-auto">
                <p>&copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği</p>
            </footer>
        </div>
    );
}
