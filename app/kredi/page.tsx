import { redirect } from 'next/navigation';
import { getCreditCampaignSlug } from '@/app/basvuru/campaign';

export const dynamic = 'force-dynamic';

/** Eski /kredi linkleri kampanya sayfasına yönlendirilir. */
export default async function KrediRedirectPage() {
    const slug = await getCreditCampaignSlug();
    redirect(slug ? `/kampanya/${slug}` : '/');
}
