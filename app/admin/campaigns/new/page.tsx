import { getActiveInstitutions, createCampaignEnhanced } from '../../actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CampaignForm from '../campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token');
    if (!token) redirect('/admin/login');

    const institutions = await getActiveInstitutions();

    async function handleCreate(formData: FormData) {
        'use server';
        return createCampaignEnhanced(null, formData);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-[#002855]">
                        Yeni Kampanya Oluştur
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Kampanya taslak olarak oluşturulur. Yayına almak için listedenaktifleştirin.
                    </p>
                </div>
            </header>

            <main>
                <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CampaignForm
                        institutions={institutions}
                        mode="create"
                        submitAction={handleCreate}
                    />
                </div>
            </main>
        </div>
    );
}
