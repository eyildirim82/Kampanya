
import React from 'react';
import { getInstitutions } from './actions';
import InstitutionTable from '@/components/admin/InstitutionTable';

export default async function InstitutionsPage() {
    const institutions = await getInstitutions();

    return (
        <div className="max-w-7xl mx-auto">
            <InstitutionTable initialInstitutions={institutions} />
        </div>
    );
}
