'use server';

import { getSupabaseClient } from '@/lib/supabase-client';
import { revalidatePath } from 'next/cache';
import { FieldTemplate } from '@/types';

export async function getFieldTemplates() {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('field_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Get Field Templates Error:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        label: item.label,
        name: item.name,
        type: item.type,
        options: item.options || [],
        required: item.required,
        order: item.order_index
    }));
}

export async function saveFieldTemplate(formData: Partial<FieldTemplate>) {
    const supabase = getSupabaseClient();

    const payload = {
        label: formData.label,
        name: formData.name,
        type: formData.type,
        options: formData.options,
        required: formData.required,
        // order_index: formData.order // Optional
    };

    let error;
    if (formData.id) {
        // Update
        const { error: updateError } = await supabase
            .from('field_templates')
            .update(payload)
            .eq('id', formData.id);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('field_templates')
            .insert(payload);
        error = insertError;
    }

    if (error) {
        return { success: false, message: 'Kaydetme hatası: ' + error.message };
    }

    revalidatePath('/admin/fields');
    return { success: true, message: 'Şablon kaydedildi.' };
}

export async function deleteFieldTemplate(id: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('field_templates')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, message: 'Silme hatası: ' + error.message };
    }

    revalidatePath('/admin/fields');
    return { success: true, message: 'Şablon silindi.' };
}
