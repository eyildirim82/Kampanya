import { getInstitutions } from '../actions';
import InstitutionList from '../components/InstitutionList';

export const dynamic = 'force-dynamic';

export default async function AdminInstitutionsPage() {
    const institutions = await getInstitutions();

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kurum Yönetimi</h1>
                    <p className="text-gray-500 mt-1">
                        Anlaşmalı kurumları buradan yönetebilirsiniz.
                    </p>
                </div>
            </div>

            <InstitutionList initialInstitutions={institutions} />
        </div>
    );
}
