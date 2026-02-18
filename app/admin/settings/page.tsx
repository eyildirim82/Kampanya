'use client';

import { useState } from 'react';
import EmailConfig from '../components/EmailConfig';
import CampaignManager from '../components/CampaignManager';
import TemplateTester from '../components/TemplateTester';
import Link from 'next/link';
import { adminLogout } from '../actions';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'tester'>('campaigns');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                            &larr; Pano
                        </Link>
                        <h1 className="text-3xl font-bold text-talpa-navy">
                            Ayarlar
                        </h1>
                    </div>

                    <form action={adminLogout}>
                        <button
                            type="submit"
                            className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                        >
                            Çıkış Yap
                        </button>
                    </form>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-4 sm:px-0 space-y-6">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2 text-gray-800">Kampanya ve Mail Yönetimi</h2>
                        <p className="text-gray-600 mb-6 text-sm">
                            Kampanyaları, kampanya bazlı şablonları ve test gönderimlerini bu ekrandan yönetebilirsiniz.
                        </p>

                        <div className="mb-6 border-b border-gray-200">
                            <nav className="-mb-px flex gap-6">
                                <button
                                    onClick={() => setActiveTab('campaigns')}
                                    className={`border-b-2 pb-2 text-sm font-medium ${activeTab === 'campaigns'
                                            ? 'border-primary text-talpa-navy'
                                            : 'border-transparent text-gray-500 hover:text-talpa-navy hover:border-primary/60'
                                        }`}
                                >
                                    Kampanyalar
                                </button>
                                <button
                                    onClick={() => setActiveTab('templates')}
                                    className={`border-b-2 pb-2 text-sm font-medium ${activeTab === 'templates'
                                            ? 'border-primary text-talpa-navy'
                                            : 'border-transparent text-gray-500 hover:text-talpa-navy hover:border-primary/60'
                                        }`}
                                >
                                    Mail Şablonları
                                </button>
                                <button
                                    onClick={() => setActiveTab('tester')}
                                    className={`border-b-2 pb-2 text-sm font-medium ${activeTab === 'tester'
                                            ? 'border-primary text-talpa-navy'
                                            : 'border-transparent text-gray-500 hover:text-talpa-navy hover:border-primary/60'
                                        }`}
                                >
                                    Test Gönderimi
                                </button>
                            </nav>
                        </div>

                        {activeTab === 'campaigns' && <CampaignManager />}
                        {activeTab === 'templates' && <EmailConfig />}
                        {activeTab === 'tester' && <TemplateTester />}
                    </div>
                </div>
            </main>
        </div>
    );
}
