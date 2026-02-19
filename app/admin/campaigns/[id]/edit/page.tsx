import { getCampaignById, updateCampaignEnhanced } from '../../../actions';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import CampaignForm from '../../campaign-form';

export const dynamic = 'force-dynamic';

export default async function EditCampaignPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token');
    if (!token) redirect('/admin/login');

    const { id } = await params;

    const campaign = await getCampaignById(id);

    if (!campaign) notFound();

    async function handleUpdate(formData: FormData) {
        'use server';
        return updateCampaignEnhanced(id, null, formData);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-talpa-navy">
                            Kampanya Düzenle
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {campaign.name} — {campaign.campaign_code}
                        </p>
                    </div>
                    <a
                        href={`/admin/campaigns/${id}`}
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        Form/İçerik Yapılandırma →
                    </a>
                </div>
            </header>

            <main>
                <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CampaignForm
                        defaultValues={campaign}
                        mode="edit"
                        submitAction={handleUpdate}
                    />
                </div>
            </main>
        </div>
    );
}
