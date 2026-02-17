import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Eski /kredi linkleri ana sayfaya yönlendirilir (kredi akışı kaldırıldı). */
export default function KrediRedirectPage() {
    redirect('/');
}
