
import React from 'react';
import { getFieldTemplates } from './actions';
import FieldLibrary from '@/components/admin/FieldLibrary';
import { FieldTemplate } from '@/types';

export default async function FieldsPage() {
    // Ensure types match
    const rawData = await getFieldTemplates();

    // Casting if necessary, or just rely on shared types
    const templates: FieldTemplate[] = rawData;

    return (
        <div className="max-w-7xl mx-auto">
            <FieldLibrary initialTemplates={templates} />
        </div>
    );
}
