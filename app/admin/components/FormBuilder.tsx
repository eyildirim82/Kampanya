'use client';

import { useState } from 'react';

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select fields
}

interface FormBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Metin' },
    { value: 'email', label: 'E-posta' },
    { value: 'tel', label: 'Telefon' },
    { value: 'number', label: 'Sayı' },
    { value: 'textarea', label: 'Uzun Metin' },
    { value: 'select', label: 'Seçim Listesi' },
    { value: 'checkbox', label: 'Onay Kutusu' },
];

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const addField = () => {
        const newField: FormField = {
            name: `field_${Date.now()}`,
            label: '',
            type: 'text',
            required: false,
            placeholder: '',
        };
        onChange([...fields, newField]);
        setExpandedIndex(fields.length);
    };

    const removeField = (index: number) => {
        const updated = fields.filter((_, i) => i !== index);
        onChange(updated);
        setExpandedIndex(null);
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        const updated = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
        onChange(updated);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;
        const updated = [...fields];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        onChange(updated);
        setExpandedIndex(newIndex);
    };

    const autoName = (label: string) => {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
            .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
            .slice(0, 30) || `field_${Date.now()}`;
    };

    return (
        <div className="space-y-3">
            {/* Field List */}
            {fields.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                    <p className="text-lg mb-1">Form alanı yok</p>
                    <p className="text-sm">Aşağıdaki butona tıklayarak alan ekleyin</p>
                </div>
            )}

            {fields.map((field, index) => (
                <div
                    key={index}
                    className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all"
                >
                    {/* Collapsed Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center">
                                {index + 1}
                            </span>
                            <div>
                                <span className="font-medium text-gray-800">
                                    {field.label || <span className="italic text-gray-400">İsimsiz Alan</span>}
                                </span>
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                    {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                </span>
                                {field.required && (
                                    <span className="ml-1 text-xs text-red-500">*zorunlu</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                title="Yukarı taşı"
                            >↑</button>
                            <button
                                onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                                disabled={index === fields.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                title="Aşağı taşı"
                            >↓</button>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeField(index); }}
                                className="p-1 text-red-400 hover:text-red-600 ml-1"
                                title="Sil"
                            >✕</button>
                            <span className="ml-1 text-gray-400 text-sm">{expandedIndex === index ? '▲' : '▼'}</span>
                        </div>
                    </div>

                    {/* Expanded Edit Panel */}
                    {expandedIndex === index && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Etiket (Label)</label>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => {
                                            const label = e.target.value;
                                            const updates: Partial<FormField> = { label };
                                            // Auto-generate name if name hasn't been manually edited
                                            if (!field.label || field.name === autoName(field.label)) {
                                                updates.name = autoName(label);
                                            }
                                            updateField(index, updates);
                                        }}
                                        placeholder="Örn: E-posta Adresi"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Alan Adı (name)</label>
                                    <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateField(index, { name: e.target.value })}
                                        placeholder="email_adresi"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                    >
                                        {FIELD_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                                    <input
                                        type="text"
                                        value={field.placeholder || ''}
                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                        placeholder="İpucu metni..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(index, { required: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Zorunlu alan</span>
                                    </label>
                                </div>
                            </div>

                            {/* Options for Select */}
                            {field.type === 'select' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Seçenekler <span className="text-gray-400">(her satıra bir tane)</span>
                                    </label>
                                    <textarea
                                        value={(field.options || []).join('\n')}
                                        onChange={(e) => updateField(index, { options: e.target.value.split('\n') })}
                                        rows={3}
                                        placeholder={"Seçenek 1\nSeçenek 2\nSeçenek 3"}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Add Field Button */}
            <button
                onClick={addField}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all font-medium text-sm"
            >
                + Alan Ekle
            </button>
        </div>
    );
}
