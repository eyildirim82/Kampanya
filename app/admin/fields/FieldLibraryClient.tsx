'use client';

import { useState } from 'react';
import { upsertFieldTemplate, deleteFieldTemplate } from '../actions';
import { toast } from 'sonner';
import { Trash2, Edit2, Plus, X } from 'lucide-react';
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
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#002855] hover:bg-[#003a75] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002855]"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Yeni Alan Ekle
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
                                        <p className="text-sm font-bold text-[#002855] truncate">
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
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            disabled={isDeleting === template.id}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                            title="Sil"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Simple Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-t-4 border-[#002855]">
                            <form onSubmit={handleSubmit}>
                                <input type="hidden" name="id" value={editingTemplate?.id} />
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-[#002855]">
                                            {editingTemplate?.id ? 'Alanı Düzenle' : 'Yeni Alan Ekle'}
                                        </h3>
                                        <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Görünen İsim (Label)</label>
                                            <input
                                                type="text"
                                                name="label"
                                                defaultValue={editingTemplate?.label}
                                                required
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#002855] focus:border-[#002855] sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Tip</label>
                                            <select
                                                name="type"
                                                defaultValue={editingTemplate?.type}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#002855] focus:border-[#002855] sm:text-sm"
                                                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, type: e.target.value as 'input' | 'select' | 'textarea' } : null)}
                                            >
                                                <option value="input">Metin Kutusu (Input)</option>
                                                <option value="select">Seçim Kutusu (Select)</option>
                                                <option value="textarea">Uzun Metin (Textarea)</option>
                                            </select>
                                        </div>

                                        {editingTemplate?.type === 'select' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Seçenekler (Virgülle ayırın)</label>
                                                <input
                                                    type="text"
                                                    name="options"
                                                    defaultValue={editingTemplate?.options.join(', ')}
                                                    placeholder="Seçenek 1, Seçenek 2..."
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#002855] focus:border-[#002855] sm:text-sm"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="isRequired"
                                                id="isRequired"
                                                defaultChecked={editingTemplate?.is_required}
                                                className="h-4 w-4 text-[#002855] focus:ring-[#002855] border-gray-300 rounded"
                                            />
                                            <label htmlFor="isRequired" className="ml-2 block text-sm text-gray-900">
                                                Zorunlu Alan
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#002855] text-base font-medium text-white hover:bg-[#003a75] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002855] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
