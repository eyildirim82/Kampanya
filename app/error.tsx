'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Alert from '@/components/theme/Alert';
import Button from '@/components/theme/Button';

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
      <div className="max-w-md w-full">
        <Alert variant="error" title="Bir hata oluştu">
          İşleminiz sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
        </Alert>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={reset}
            aria-label="Hatayı düzeltmek için tekrar dene"
          >
            Tekrar Dene
          </Button>
          <Link href="/" aria-label="Ana sayfaya dön" className="inline-block">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Ana Sayfa
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
