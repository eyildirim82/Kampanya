import { Suspense } from 'react';
import Image from 'next/image';
import ApplicationForm from './form';
import { Card } from '@/components/theme/Card';
import { PrivateCardBenefits } from '@/components/PrivateCardBenefits';
import { getActiveCampaigns } from './campaign';
import { BrandProvider } from '@/components/theme/BrandProvider';

export const dynamic = 'force-dynamic';

export default async function ApplicationPage() {
    const campaigns = await getActiveCampaigns();
    const campaign = campaigns[0] || null;

    if (!campaign) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">Aktif Başvuru Dönemi Bulunamadı</h1>
                    <p className="text-gray-600 mt-2">Şu anda aktif bir kampanya bulunmamaktadır.</p>
                </div>
            </div>
        );
    }

    return (
        <BrandProvider brand={{
            primaryColor: '#00558d',
            secondaryColor: '#002855',
        }}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Top Banner */}
                    <div className="mb-4 flex justify-center fade-in">
                        <Image
                            src="/denizbank-1.jpg"
                            alt="Brand Banner"
                            width={800}
                            height={400}
                            className="w-full max-w-3xl h-auto rounded-xl shadow-lg"
                            priority
                        />
                    </div>

                    {/* Hero Section */}
                    <div className="text-center mb-4 fade-in">
                        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 leading-tight">
                            <span className="gradient-text-hero">
                                {campaign.institution?.name || 'Private Kart'}
                            </span>
                            <br />
                            <span className="text-lg md:text-xl text-gray-700 font-normal">
                                Özel Avantajlar Sizi Bekliyor
                            </span>
                        </h1>

                        <p className="mt-2 text-sm md:text-base text-gray-700 max-w-2xl mx-auto leading-relaxed">
                            TALPA ve <strong className="text-[var(--brand-primary)]">{campaign.institution?.name || 'DenizBank'}</strong> iş birliği ile, normalde sadece <strong className="text-[var(--brand-secondary)]">yüksek portföy müşterilerine</strong> sunulan,
                            piyasadaki en iyi restoran/otel indirimlerine ve bir çok özelliğe sahip
                            <strong className="text-[var(--brand-primary)]"> {campaign.title || 'Kampanya'}</strong> hizmetinizdedir.
                        </p>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 mb-6 max-w-2xl mx-auto">
                        {/* IGA Lounge Card */}
                        <Card
                            variant="glass"
                            padding="sm"
                        >
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-base text-[var(--brand-secondary)] mb-1">IGA Lounge</h3>
                                <p className="text-gray-600 text-xs">
                                    Ayda <strong>2 İç/2 Dış Hat</strong>
                                </p>
                            </div>
                        </Card>

                        {/* TAV Passport Card */}
                        <Card
                            variant="glass"
                            padding="sm"
                        >
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-base text-[var(--brand-secondary)] mb-1">TAV Passport</h3>
                                <p className="text-gray-600 text-xs">
                                    <strong>2 Otopark / 2 Lounge / 2 FastTrack</strong>
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Form Section */}
                    <Suspense fallback={
                        <Card className="flex justify-center items-center p-12">
                            <div className="text-center">
                                <svg className="animate-spin h-12 w-12 text-[var(--brand-secondary)] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-500">Form yükleniyor...</p>
                            </div>
                        </Card>
                    }>
                        <ApplicationForm campaign={campaign} />
                    </Suspense>

                    {/* Detailed Benefits Section */}
                    <div className="my-10">
                        <PrivateCardBenefits />
                    </div>
                </div>
            </div>
        </BrandProvider>
    );
}
