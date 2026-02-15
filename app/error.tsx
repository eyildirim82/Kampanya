'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('App Error:', error.message, error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bir hata oluştu</h1>
        <p className="text-gray-600 mb-6">
          İşleminiz sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
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
            href="/"
            className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002855] focus-visible:ring-offset-2 rounded-lg inline-block text-center"
            aria-label="Ana sayfaya dön"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
