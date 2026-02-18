import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = new URLSearchParams();
    const sp = await searchParams;
    for (const [key, value] of Object.entries(sp)) {
        if (typeof value === 'string') params.set(key, value);
        else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    }

    const suffix = params.toString();
    redirect(suffix ? `/admin?${suffix}` : '/admin');
}

