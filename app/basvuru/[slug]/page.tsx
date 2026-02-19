import { Suspense } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ApplicationForm from '../form';
import { Card } from '@/components/theme/Card';
import { PrivateCardBenefits } from '@/components/PrivateCardBenefits';
import { getCampaignBySlug } from '../campaign';
import { BrandProvider } from '@/components/theme/BrandProvider';

export const dynamic = 'force-dynamic';

export default async function CampaignApplicationPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const campaign = await getCampaignBySlug(slug);

    if (!campaign) {
        notFound();
    }

    return (
        <BrandProvider brand={{
            primaryColor: '#00558d',
            secondaryColor: '#002855',
        }}>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
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

                    <div className="text-center mb-4 fade-in">
                        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 leading-tight">
                            <span className="gradient-text-hero">{campaign.name || 'Private Kart'}</span>
                            <br />
                            <span className="text-lg md:text-xl text-gray-700 font-normal">
                                Özel Avantajlar Sizi Bekliyor
                            </span>
                        </h1>
                    </div>

                    <Suspense
                        fallback={
                            <Card className="flex justify-center items-center p-12">
                                <div className="text-center">
                                    <svg
                                        className="animate-spin h-12 w-12 text-[var(--brand-secondary)] mx-auto mb-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-gray-500">Form yükleniyor...</p>
                                </div>
                            </Card>
                        }
                    >
                        <ApplicationForm campaign={campaign} />
                    </Suspense>

                    <div className="my-10">
                        <PrivateCardBenefits />
                    </div>
                </div>
            </div>
        </BrandProvider>
    );
}
