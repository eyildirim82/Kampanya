import Link from 'next/link';
import Button from '@/components/theme/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sayfa bulunamadı</h1>
        <p className="text-gray-600 mb-6">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link href="/" aria-label="Ana sayfaya dön">
          <Button variant="primary" size="md">
            Ana Sayfa
          </Button>
        </Link>
      </div>
    </div>
  );
}
