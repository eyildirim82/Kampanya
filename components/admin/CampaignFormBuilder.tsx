'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/theme/Icon';
import { FormField, FieldTemplate } from '@/types';
import Card from '@/components/theme/Card';
import Button from '@/components/theme/Button';
import Input from '@/components/theme/Input';

const getFieldTemplates = async () => {
    return [] as FieldTemplate[];
};

interface FormBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

const CampaignFormBuilder: React.FC<FormBuilderProps> = ({ fields, onChange }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [templates, setTemplates] = useState<FieldTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        if (isLibraryOpen && templates.length === 0) {
            loadTemplates();
        }
    }, [isLibraryOpen]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await getFieldTemplates();
            setTemplates(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const addField = () => {
        const newField: FormField = {
            id: Math.random().toString(36).substr(2, 9),
            name: `field_${Date.now()}`,
            label: 'Yeni Alan',
            type: 'text',
            required: false,
            width: 'full'
        };
        onChange([...fields, newField]);
        setEditingId(newField.id!);
    };

    const addFromTemplate = (template: FieldTemplate) => {
        const newField: FormField = {
            id: Math.random().toString(36).substr(2, 9),
            name: `field_${Date.now()}`,
            label: template.label,
            type: template.type,
            required: template.required,
            options: template.options,
            width: 'full'
        };
        onChange([...fields, newField]);
        setIsLibraryOpen(false);
    };

    const removeField = (id: string) => {
        if (window.confirm('Bu alanı silmek istediğinize emin misiniz?')) {
            onChange(fields.filter(f => f.id !== id));
        }
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        onChange(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        onChange(newFields);
    };

    return (
        <div className="space-y-4">
            {isLibraryOpen && (
                <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Icon name="menu_book" size="sm" className="text-talpa-navy" /> Alan Kütüphanesi
                            </h3>
                            <button onClick={() => setIsLibraryOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Icon name="close" size="sm" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                            {loadingTemplates ? (
                                <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                                    <Icon name="menu_book" size="lg" className="text-slate-300 mb-2" />
                                    <p>Kayıtlı şablon bulunamadı.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {templates.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={() => addFromTemplate(template)}
                                            className="text-left p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-primary hover:shadow-md transition-all group"
                                        >
                                            <div className="font-semibold text-slate-800 group-hover:text-talpa-navy">{template.label}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase">{template.type}</span>
                                                {template.required && <span className="text-xs text-red-600 font-medium">Zorunlu</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {fields.length === 0 && (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 flex flex-col items-center">
                    <Icon name="settings" size="lg" className="text-slate-300 mb-3" />
                    <p className="font-medium">Henüz form alanı eklenmemiş.</p>
                    <p className="text-sm mt-1">"Alan Ekle" veya "Kütüphaneden Ekle" butonlarını kullanın.</p>
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="bg-white rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:shadow-md">
                        <div className="p-3 flex items-center gap-3">
                            <div className="flex flex-col gap-0.5 text-slate-300">
                                <button
                                    onClick={() => moveField(index, 'up')}
                                    className="hover:text-talpa-navy disabled:opacity-30 disabled:hover:text-slate-300"
                                    disabled={index === 0}
                                >
                                    ▲
                                </button>
                                <button
                                    onClick={() => moveField(index, 'down')}
                                    className="hover:text-talpa-navy disabled:opacity-30 disabled:hover:text-slate-300"
                                    disabled={index === fields.length - 1}
                                >
                                    ▼
                                </button>
                            </div>

                            <div className="flex-1 cursor-pointer" onClick={() => setEditingId(editingId === field.id ? null : field.id ?? null)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-slate-800">{field.label}</span>
                                    {field.required && <span className="text-[10px] uppercase font-bold tracking-wider bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Zorunlu</span>}
                                    <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{field.type}</span>
                                </div>
                                <div className="text-xs text-slate-400 font-mono">var: {field.name}</div>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(editingId === field.id ? null : field.id ?? null)}>
                                    <Icon name="settings" size="sm" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeField(field.id!)}>
                                    <Icon name="delete" size="sm" />
                                </Button>
                            </div>
                        </div>

                        {editingId === field.id && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                <Input
                                    label="Etiket (Label)"
                                    value={field.label}
                                    onChange={(e) => updateField(field.id!, { label: e.target.value })}
                                />
                                <Input
                                    label="Değişken Adı (Name)"
                                    value={field.name}
                                    onChange={(e) => updateField(field.id!, { name: e.target.value })}
                                    helperText="Form datasında kullanılacak unique key"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Tip</label>
                                    <select
                                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={field.type}
                                        onChange={(e) => updateField(field.id!, { type: e.target.value as any })}
                                    >
                                        <option value="text">Metin (Text)</option>
                                        <option value="textarea">Uzun Metin (Textarea)</option>
                                        <option value="email">E-Posta</option>
                                        <option value="tel">Telefon</option>
                                        <option value="number">Sayı</option>
                                        <option value="select">Seçim (Select)</option>
                                        <option value="checkbox">Onay Kutusu (Checkbox)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Genişlik</label>
                                    <select
                                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={field.width || 'full'}
                                        onChange={(e) => updateField(field.id!, { width: e.target.value as any })}
                                    >
                                        <option value="full">Tam Genişlik (1/1)</option>
                                        <option value="half">Yarım (1/2)</option>
                                        <option value="third">Üçte Bir (1/3)</option>
                                    </select>
                                </div>

                                {field.type === 'select' && (
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Seçenekler</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Her satıra veya virgülle ayrılmış bir seçenek yazın"
                                            className="flex w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => updateField(field.id!, { options: e.target.value.split(',').map(s => s.trim()) })}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Seçenekleri virgül ile ayırın.</p>
                                    </div>
                                )}

                                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200/50">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group w-fit">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${field.required ? 'bg-talpa-navy border-talpa-navy' : 'bg-white border-slate-300 group-hover:border-primary'}`}>
                                            {field.required && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={field.required}
                                            onChange={(e) => updateField(field.id!, { required: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Bu alan zorunludur</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" onClick={addField} leftIcon={<Icon name="add" size="sm" />}>
                    Alan Ekle
                </Button>
                <Button variant="outline" onClick={() => setIsLibraryOpen(true)} leftIcon={<Icon name="menu_book" size="sm" />}>
                    Kütüphane
                </Button>
            </div>
        </div>
    );
};

export default CampaignFormBuilder;
