'use client';

import EmailConfig from '../components/EmailConfig';
import Link from 'next/link';
import { adminLogout } from '../actions';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
                            &larr; Pano
                        </Link>
                        <h1 className="text-3xl font-bold text-[#002855]">
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
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">E-posta Bildirim Kuralları</h2>
                        <p className="text-gray-600 mb-6 text-sm">
                            Buradan sisteme gelen başvurular için otomatik e-posta gönderim kurallarını yönetebilirsiniz.
                        </p>

                        {/* We are reusing the component from campaigns folder temporarily 
                            until we can move it or delete the folder. 
                            It is now context-agnostic. */}
                        <EmailConfig />
                    </div>
                </div>
            </main>
        </div>
    );
}
