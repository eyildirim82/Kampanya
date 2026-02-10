'use client';

import { Suspense } from 'react';
import CreditApplicationForm from './form';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default function CreditCampaignPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Hero Section */}
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

                {/* Offer Table */}
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

                {/* Application Form */}
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
                    <CreditApplicationForm />
                </Suspense>

            </div>
        </div>
    );
}
