'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/theme/Icon';
import { getFieldTemplates } from '../app/admin/actions';

export type FormFieldType = 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'date';

export interface FormField {
    id: string;
    label: string;
    name: string; // key for db/api
    type: FormFieldType;
    required: boolean;
    placeholder?: string;
    options?: string[]; // for select
    width?: 'full' | 'half' | 'third';
}

interface FormBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

interface LibraryTemplate {
    id: string;
    label: string;
    type: string;
    options: string[];
    is_required: boolean;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
    const [libraryTemplates, setLibraryTemplates] = useState<LibraryTemplate[]>([]);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadLibrary = async () => {
            const data = await getFieldTemplates();
            setLibraryTemplates(data);
        };
        loadLibrary();
    }, []);

    const addField = () => {
        const newField: FormField = {
            id: crypto.randomUUID(),
            label: 'Yeni Alan',
            name: `field_${Date.now()}`,
            type: 'text',
            required: false,
            width: 'full'
        };
        onChange([...fields, newField]);
    };

    const addFromLibrary = (template: LibraryTemplate) => {
        const newField: FormField = {
            id: crypto.randomUUID(),
            label: template.label,
            name: `${template.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
            type: template.type === 'input' ? 'text' : template.type as FormFieldType,
            required: template.is_required || false,
            options: template.options || [],
            width: 'full'
        };
        onChange([...fields, newField]);
        setIsLibraryOpen(false);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
        onChange(newFields);
    };

    const removeField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === fields.length - 1) return;

        const newFields = [...fields];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
        onChange(newFields);
    };

    const filteredTemplates = libraryTemplates.filter(t =>
        t.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <span className="text-sm font-medium text-gray-700">Form Tasarımı ({fields.length} Alan)</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLibraryOpen(true)}
                        type="button"
                        className="flex items-center gap-1 text-xs bg-talpa-navy text-white px-3 py-1.5 rounded hover:bg-talpa-navy/80 transition-colors"
                    >
                        <Icon name="local_library" size="xs" />
                        Kütüphaneden Seç
                    </button>
                    <button
                        onClick={addField}
                        type="button"
                        className="flex items-center gap-1 text-xs bg-talpa-navy text-white px-3 py-1.5 rounded hover:bg-talpa-navy/80 transition-colors"
                    >
                        <Icon name="add" size="xs" />
                        Alan Ekle
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {fields.length === 0 && (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                        Henüz form alanı eklenmemiş.
                    </div>
                )}

                {fields.map((field, idx) => (
                    <div key={field.id} className="bg-white border rounded-lg p-4 shadow-sm relative group hover:border-primary transition-colors">
                        <div className="absolute right-2 top-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveField(idx, 'up')} className="p-1 text-gray-400 hover:text-gray-600" title="Yukarı">↑</button>
                            <button onClick={() => moveField(idx, 'down')} className="p-1 text-gray-400 hover:text-gray-600" title="Aşağı">↓</button>
                            <button onClick={() => removeField(field.id)} className="p-1 text-red-400 hover:text-red-600" title="Sil">
                                <Icon name="delete" size="sm" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-gray-500">Etiket (Görünen İsim)</label>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        className="w-full text-sm font-medium border-b border-gray-200 focus:border-primary outline-none py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Değişken Adı (Veritabanı)</label>
                                    <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })}
                                        className="w-full text-xs font-mono text-gray-600 border-b border-gray-200 focus:border-primary outline-none py-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500">Tip</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })}
                                            className="w-full text-sm border-b border-gray-200 focus:border-primary outline-none py-1 bg-transparent"
                                        >
                                            <option value="text">Metin</option>
                                            <option value="email">E-posta</option>
                                            <option value="tel">Telefon</option>
                                            <option value="number">Sayı</option>
                                            <option value="textarea">Uzun Metin</option>
                                            <option value="select">Seçim (Select)</option>
                                            <option value="date">Tarih</option>
                                            <option value="checkbox">Onay Kutusu</option>
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500">Genişlik</label>
                                        <select
                                            value={field.width || 'full'}
                                            onChange={(e) => updateField(field.id, { width: e.target.value as 'full' | 'half' | 'third' })}
                                            className="w-full text-sm border-b border-gray-200 focus:border-primary outline-none py-1 bg-transparent"
                                        >
                                            <option value="full">Tam</option>
                                            <option value="half">Yarım (1/2)</option>
                                            <option value="third">Üçte Bir (1/3)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        id={`req_${field.id}`}
                                        className="rounded text-talpa-navy"
                                    />
                                    <label htmlFor={`req_${field.id}`} className="text-xs text-gray-600 cursor-pointer">Zorunlu Alan</label>
                                </div>
                            </div>
                        </div>

                        {field.type === 'select' && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <label className="block text-xs text-gray-500 mb-1">Seçenekler (Virgülle Ayırın)</label>
                                <input
                                    type="text"
                                    value={field.options?.join(', ') || ''}
                                    onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    placeholder="Örn: Seçenek 1, Seçenek 2, Seçenek 3"
                                    className="w-full text-sm border rounded px-2 py-1 bg-gray-50"
                                />
                            </div>
                        )}

                        {(field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'textarea') && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                    placeholder="Placeholder metni..."
                                    className="w-full text-xs text-gray-400 border-none outline-none bg-transparent placeholder-gray-300"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Library Modal */}
            {isLibraryOpen && (
                <div className="fixed inset-0 z-modal overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsLibraryOpen(false)}></div>

                        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden border-t-8 border-primary">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Icon name="local_library" size="md" className="text-primary" />
                                    Alan Kütüphanesi
                                </h3>
                                <button onClick={() => setIsLibraryOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <Icon name="close" size="md" />
                                </button>
                            </div>

                            <div className="p-4 border-b bg-white">
                                <div className="relative">
                                    <Icon name="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Alanlarda ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                                {filteredTemplates.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 italic">
                                        Uygun alan bulunamadı.
                                    </div>
                                ) : (
                                    filteredTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => addFromLibrary(template)}
                                            className="w-full text-left p-4 rounded-lg border bg-white hover:border-primary hover:shadow-md transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                        {template.label}
                                                    </p>
                                                    <div className="mt-1 flex gap-2">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 border">
                                                            {template.type}
                                                        </span>
                                                        {template.is_required && (
                                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">
                                                                Zorunlu
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Icon name="add" size="md" className="text-gray-300 group-hover:text-primary" />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t bg-gray-50 text-center">
                                <p className="text-xs text-gray-500">
                                    Kütüphaneyi yönetmek için <a href="/admin/fields" target="_blank" className="text-primary hover:underline">Alan Kütüphanesi</a> sayfasını kullanın.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
