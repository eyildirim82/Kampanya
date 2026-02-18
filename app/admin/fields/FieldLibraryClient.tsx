'use client';

import { useState } from 'react';
import { upsertFieldTemplate, deleteFieldTemplate } from '../actions';
import { toast } from 'sonner';
import Icon from '@/components/theme/Icon';
import { Modal } from '@/components/theme/Modal';
import { Button } from '@/components/theme/Button';
import { useRouter } from 'next/navigation';

interface FieldTemplate {
    id: string;
    label: string;
    type: 'input' | 'select' | 'textarea';
    options: string[];
    is_required: boolean;
    created_at?: string;
}

interface Props {
    initialTemplates: FieldTemplate[];
}

export default function FieldLibraryClient({ initialTemplates }: Props) {
    const [templates, setTemplates] = useState<FieldTemplate[]>(initialTemplates);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const handleOpenModal = (template?: FieldTemplate) => {
        setEditingTemplate(template || { id: '', label: '', type: 'input', options: [], is_required: false });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
        setIsDeleting(id);
        const res = await deleteFieldTemplate(id);
        if (res.success) {
            toast.success('Şablon silindi.');
            setTemplates(templates.filter(t => t.id !== id));
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setIsDeleting(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);

        const res = await upsertFieldTemplate(null, formData);
        if (res.success) {
            toast.success(res.message);
            handleCloseModal();
            // In a real app we'd refresh or re-fetch properly
            // For now, let's just refresh the router to get fresh server data if possible
            // but we also update local state for immediate feedback
            router.refresh();
            // Hard refresh for this simple version to ensure parity with DB
            window.location.reload();
        } else {
            toast.error(res.message);
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Kayıtlı Alanlar
                    </h3>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-talpa-navy hover:bg-talpa-navy/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        <Icon name="add" size="sm" className="mr-2" /> Yeni Alan Ekle
                    </button>
                </div>
                <ul className="divide-y divide-gray-200">
                    {templates.length === 0 ? (
                        <li className="px-4 py-12 text-center text-gray-500 italic">
                            Henüz kayıtlı alan şablonu bulunmuyor.
                        </li>
                    ) : (
                        templates.map((template) => (
                            <li key={template.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-talpa-navy truncate">
                                            {template.label}
                                        </p>
                                        <div className="mt-1 flex items-center text-xs text-gray-500 space-x-2">
                                            <span className="capitalize px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                {template.type === 'input' ? 'Metin' : template.type === 'select' ? 'Seçim' : 'Uzun Metin'}
                                            </span>
                                            {template.is_required && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                                    Zorunlu
                                                </span>
                                            )}
                                            {template.type === 'select' && (
                                                <span className="truncate">
                                                    Seçenekler: {template.options.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                                        <button
                                            onClick={() => handleOpenModal(template)}
                                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                                            title="Düzenle"
                                        >
                                            <Icon name="edit" size="md" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            disabled={isDeleting === template.id}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                            title="Sil"
                                        >
                                            <Icon name="delete" size="md" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <Modal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={editingTemplate?.id ? 'Alanı Düzenle' : 'Yeni Alan Ekle'}
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={handleCloseModal}>
                            İptal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isSaving}
                            onClick={() => {
                                const form = document.getElementById('field-form') as HTMLFormElement;
                                form?.requestSubmit();
                            }}
                        >
                            Kaydet
                        </Button>
                    </>
                }
            >
                <form id="field-form" onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" name="id" value={editingTemplate?.id} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Görünen İsim (Label)</label>
                        <input
                            type="text"
                            name="label"
                            defaultValue={editingTemplate?.label}
                            required
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl py-2 px-3 text-sm bg-white dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tip</label>
                        <select
                            name="type"
                            defaultValue={editingTemplate?.type}
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl py-2 px-3 text-sm bg-white dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            aria-label="Alan tipi"
                            onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, type: e.target.value as 'input' | 'select' | 'textarea' } : null)}
                        >
                            <option value="input">Metin Kutusu (Input)</option>
                            <option value="select">Seçim Kutusu (Select)</option>
                            <option value="textarea">Uzun Metin (Textarea)</option>
                        </select>
                    </div>

                    {editingTemplate?.type === 'select' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Seçenekler (Virgülle ayırın)</label>
                            <input
                                type="text"
                                name="options"
                                defaultValue={editingTemplate?.options.join(', ')}
                                placeholder="Seçenek 1, Seçenek 2..."
                                className="w-full border border-gray-300 dark:border-white/10 rounded-xl py-2 px-3 text-sm bg-white dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="isRequired"
                            id="isRequired"
                            defaultChecked={editingTemplate?.is_required}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="isRequired" className="text-sm text-gray-900 dark:text-slate-300">
                            Zorunlu Alan
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
