'use server';

import { getSupabaseClient } from '@/lib/supabase-client';
import { revalidatePath } from 'next/cache';
import { Institution } from '@/types';

export async function getInstitutions() {
    const supabase = getSupabaseClient();

    // Select all institutions, ordered by name
    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');

    if (error) {
        console.error('Get Institutions Error:', error);
        return [];
    }

    // Map manually to ensure type safety if needed, or cast
    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        logoUrl: item.logo_url,
        contactEmail: item.contact_email,
        isActive: item.is_active
    }));
}

export async function saveInstitution(formData: Partial<Institution>) {
    const supabase = getSupabaseClient();

    const payload = {
        name: formData.name,
        code: formData.code,
        logo_url: formData.logoUrl,
        contact_email: formData.contactEmail,
        is_active: formData.isActive
    };

    let error;
    if (formData.id) {
        // Update
        const { error: updateError } = await supabase
            .from('institutions')
            .update(payload)
            .eq('id', formData.id);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('institutions')
            .insert(payload);
        error = insertError;
    }

    if (error) {
        return { success: false, message: 'Kaydetme hatası: ' + error.message };
    }

    revalidatePath('/admin/institutions');
    return { success: true, message: 'Kurum kaydedildi.' };
}

export async function deleteInstitution(id: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, message: 'Silme hatası: ' + error.message };
    }

    revalidatePath('/admin/institutions');
    return { success: true, message: 'Kurum silindi.' };
}
