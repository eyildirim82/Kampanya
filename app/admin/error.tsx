'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin Error:', error.message, error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Yönetim panelinde hata</h1>
        <p className="text-gray-600 mb-6">
          Bu sayfa yüklenirken bir sorun oluştu. Tekrar deneyin veya panele dönün.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 bg-[#002855] text-white font-medium rounded-lg hover:bg-[#003366] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002855] focus-visible:ring-offset-2"
            aria-label="Hatayı düzeltmek için tekrar dene"
          >
            Tekrar Dene
          </button>
          <Link
            href="/admin/dashboard"
            className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors rounded-lg inline-block text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002855] focus-visible:ring-offset-2"
            aria-label="Yönetim paneline dön"
          >
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
