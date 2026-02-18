'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/theme/Alert';
import { Button } from '@/components/theme/Button';
import { Card } from '@/components/theme/Card';

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
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-background-dark">
      <Card variant="default" padding="lg" className="max-w-md w-full">
        <Alert variant="destructive" title="Yönetim panelinde hata">
          Bu sayfa yüklenirken bir sorun oluştu. Tekrar deneyin veya panele dönün.
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
          <Link href="/admin" aria-label="Yönetim paneline dön" className="inline-block">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Panele Dön
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
