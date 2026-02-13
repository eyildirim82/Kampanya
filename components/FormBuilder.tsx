'use client';

import { TrashIcon, PlusIcon } from 'lucide-react'; // Using lucide-react as found in package.json

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

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {

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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                <span className="text-sm font-medium text-gray-700">Form Tasarımı ({fields.length} Alan)</span>
                <button
                    onClick={addField}
                    type="button"
                    className="flex items-center gap-1 text-xs bg-[#002855] text-white px-3 py-1.5 rounded hover:bg-[#003366] transition-colors"
                >
                    <PlusIcon className="w-3 h-3" />
                    Alan Ekle
                </button>
            </div>

            <div className="space-y-3">
                {fields.length === 0 && (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                        Henüz form alanı eklenmemiş.
                    </div>
                )}

                {fields.map((field, idx) => (
                    <div key={field.id} className="bg-white border rounded-lg p-4 shadow-sm relative group hover:border-[#002855] transition-colors">
                        <div className="absolute right-2 top-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveField(idx, 'up')} className="p-1 text-gray-400 hover:text-gray-600" title="Yukarı">↑</button>
                            <button onClick={() => moveField(idx, 'down')} className="p-1 text-gray-400 hover:text-gray-600" title="Aşağı">↓</button>
                            <button onClick={() => removeField(field.id)} className="p-1 text-red-400 hover:text-red-600" title="Sil">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                            {/* Label & Name */}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-gray-500">Etiket (Görünen İsim)</label>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        className="w-full text-sm font-medium border-b border-gray-200 focus:border-[#002855] outline-none py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Değişken Adı (Veritabanı)</label>
                                    <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                        className="w-full text-xs font-mono text-gray-600 border-b border-gray-200 focus:border-[#002855] outline-none py-1"
                                    />
                                </div>
                            </div>

                            {/* Type & Width */}
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500">Tip</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })}
                                            className="w-full text-sm border-b border-gray-200 focus:border-[#002855] outline-none py-1 bg-transparent"
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
                                            onChange={(e) => updateField(field.id, { width: e.target.value as any })}
                                            className="w-full text-sm border-b border-gray-200 focus:border-[#002855] outline-none py-1 bg-transparent"
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
                                        className="rounded text-[#002855]"
                                    />
                                    <label htmlFor={`req_${field.id}`} className="text-xs text-gray-600 cursor-pointer">Zorunlu Alan</label>
                                </div>
                            </div>
                        </div>

                        {/* Options for Select */}
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

                        {/* Placeholder */}
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
        </div>
    );
}
