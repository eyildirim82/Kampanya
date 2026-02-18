'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/theme/Icon';
import { FieldTemplate } from '@/types';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Input from '@/components/theme/Input';
import Alert from '@/components/theme/Alert';
import { saveFieldTemplate, deleteFieldTemplate } from '@/app/admin/fields/actions';

interface FieldLibraryProps {
    initialTemplates: FieldTemplate[];
}

const FieldLibrary: React.FC<FieldLibraryProps> = ({ initialTemplates }) => {
    const router = useRouter();
    const [templates, setTemplates] = useState<FieldTemplate[]>(initialTemplates);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<FieldTemplate>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        setTemplates(initialTemplates);
    }, [initialTemplates]);

    const handleOpenModal = (template?: FieldTemplate) => {
        if (template) {
            setFormData({ ...template });
        } else {
            setFormData({
                label: '',
                name: '',
                type: 'text',
                options: [],
                required: false
            });
        }
        setError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.label || !formData.name) return;

        setIsSaving(true);
        setError(null);

        const result = await saveFieldTemplate(formData);

        if (result.success) {
            handleCloseModal();
            router.refresh();
        } else {
            setError(result.message || 'Hata oluştu.');
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;

        setTemplates(prev => prev.filter(t => t.id !== id));

        const result = await deleteFieldTemplate(id);
        if (!result.success) {
            alert(result.message);
            router.refresh();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Alan Kütüphanesi</h1>
                    <p className="text-sm text-slate-500 mt-1">Kampanya formlarında tekrar kullanılabilir alan şablonları.</p>
                </div>
                <Button onClick={() => handleOpenModal()} leftIcon={<Icon name="add" size="sm" />}>
                    Yeni Alan Şablonu
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <Icon name="menu_book" size="lg" className="mx-auto mb-3 text-slate-300" />
                        <p>Henüz şablon bulunmuyor.</p>
                    </div>
                ) : (
                    templates.map((template) => (
                        <Card key={template.id} className="relative group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 bg-blue-50 text-talpa-navy rounded-md font-mono text-xs uppercase font-bold border border-blue-100">
                                        {template.type}
                                    </span>
                                    {template.required && (
                                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            ZORUNLU
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(template)} className="p-1.5 text-slate-400 hover:text-talpa-navy hover:bg-slate-100 rounded transition-colors">
                                        <Icon name="edit" size="xs" />
                                    </button>
                                    <button onClick={() => handleDelete(template.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <Icon name="delete" size="xs" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-900 mb-1">{template.label}</h3>
                            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono block w-fit mb-3">
                                {template.name}
                            </code>

                            {template.type === 'select' && template.options && template.options.length > 0 && (
                                <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                                    <span className="font-semibold text-slate-700">Seçenekler:</span> {template.options.slice(0, 3).join(', ')}
                                    {template.options.length > 3 && ` +${template.options.length - 3}`}
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">{formData.id ? 'Şablonu Düzenle' : 'Yeni Şablon Ekle'}</h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors"><Icon name="close" size="sm" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {error && <Alert variant="error">{error}</Alert>}

                            <Input
                                label="Alan Etiketi (Label)"
                                placeholder="Örn: Anne Kızlık Soyadı"
                                required
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            />

                            <Input
                                label="Değişken Adı (Name)"
                                placeholder="Örn: mother_maiden_name"
                                required
                                helperText="İngilizce karakterler kullanın. Benzersiz olmalı."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Tip</label>
                                <select
                                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
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

                            {formData.type === 'select' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Seçenekler</label>
                                    <textarea
                                        className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        rows={3}
                                        placeholder="Her satıra veya virgülle ayrılmış bir seçenek yazın"
                                        value={formData.options?.join(', ') || ''}
                                        onChange={(e) => setFormData({ ...formData, options: e.target.value.split(',').map(s => s.trim()) })}
                                    />
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="rounded text-talpa-navy focus:ring-primary h-4 w-4"
                                        checked={formData.required}
                                        onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-700 font-medium">Bu alan zorunludur</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                <Button type="button" variant="ghost" fullWidth onClick={handleCloseModal}>İptal</Button>
                                <Button type="submit" fullWidth isLoading={isSaving} leftIcon={<Icon name="save" size="sm" />}>Kaydet</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldLibrary;
