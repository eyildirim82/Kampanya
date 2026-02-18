'use client';

import { useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/theme/Icon';
import { Modal } from '@/components/theme/Modal';
import { Button } from '@/components/theme/Button';
import { toast } from 'sonner';
import { deleteInstitution, upsertInstitution } from '../actions';

function InstitutionLogo({ src, alt }: { src: string; alt: string }) {
    const [error, setError] = useState(false);
    if (error) {
        return <Icon name="account_balance" size="md" className="text-gray-400" />;
    }
    return (
        <Image
            src={src}
            alt={alt}
            width={40}
            height={40}
            className="w-full h-full object-contain p-1"
            unoptimized
            onError={() => setError(true)}
        />
    );
}

interface Institution {
    id: string;
    name: string;
    code: string;
    contact_email?: string;
    logo_url?: string;
    is_active: boolean;
}

export default function InstitutionList({ initialInstitutions }: { initialInstitutions: Institution[] }) {
    const [institutions, setInstitutions] = useState<Institution[]>(initialInstitutions);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contactEmail: '',
        logoUrl: '',
        isActive: true
    });

    const openModal = (inst?: Institution) => {
        if (inst) {
            setEditingId(inst.id);
            setFormData({
                name: inst.name,
                code: inst.code,
                contactEmail: inst.contact_email || '',
                logoUrl: inst.logo_url || '',
                isActive: inst.is_active
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                code: '',
                contactEmail: '',
                logoUrl: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kurumu silmek istediğinize emin misiniz?')) return;

        const result = await deleteInstitution(id);
        if (result.success) {
            toast.success(result.message);
            // Optimistic update
            setInstitutions(prev => prev.filter(i => i.id !== id));
        } else {
            toast.error(result.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const form = new FormData();
        if (editingId) form.append('id', editingId);
        form.append('name', formData.name);
        form.append('code', formData.code);
        if (formData.contactEmail) form.append('contactEmail', formData.contactEmail);
        if (formData.logoUrl) form.append('logoUrl', formData.logoUrl);
        if (formData.isActive) form.append('isActive', 'on');

        const result = await upsertInstitution(null, form);

        setLoading(false);
        if (result.success) {
            toast.success(result.message);
            setIsModalOpen(false);
            // In a real app we might re-fetch, but for now reload or just accept verify via refresh
            // Better: Return the new item from server action and update state.
            // For now, simple refresh via router or just full page reload
            window.location.reload();
        } else {
            toast.error(result.message);
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Kurum Listesi</h3>
                    <button
                        onClick={() => openModal()}
                        className="bg-talpa-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-talpa-navy/80 flex items-center gap-2"
                    >
                        <Icon name="add" size="sm" />
                        Yeni Kurum
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Kurum Adı</th>
                                <th className="px-6 py-3 font-semibold">Kod</th>
                                <th className="px-6 py-3 font-semibold">İletişim</th>
                                <th className="px-6 py-3 font-semibold">Durum</th>
                                <th className="px-6 py-3 font-semibold text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {institutions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Henüz kurum eklenmemiş.
                                    </td>
                                </tr>
                            ) : (
                                institutions.map((inst) => (
                                    <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                                                    {inst.logo_url ? (
                                                        <InstitutionLogo src={inst.logo_url} alt={inst.name} />
                                                    ) : (
                                                        <Icon name="account_balance" size="md" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{inst.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs bg-gray-50/50 rounded px-2 py-1 w-fit">
                                            {inst.code}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {inst.contact_email || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inst.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <Icon name="check_circle" size="xs" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    <Icon name="cancel" size="xs" /> Pasif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(inst)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <Icon name="edit" size="sm" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(inst.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Icon name="delete" size="sm" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Kurumu Düzenle' : 'Yeni Kurum Ekle'}
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                            İptal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={loading}
                            onClick={() => {
                                const form = document.getElementById('institution-form') as HTMLFormElement;
                                form?.requestSubmit();
                            }}
                        >
                            Kaydet
                        </Button>
                    </>
                }
            >
                <form id="institution-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kurum Adı</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-dark outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Örn: DenizBank"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kurum Kodu</label>
                        <input
                            type="text"
                            required
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-dark outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Örn: DENIZBANK"
                        />
                        <p className="text-xs text-gray-500 mt-1">Sistem içi benzersiz kod.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İletişim E-posta</label>
                        <input
                            type="email"
                            value={formData.contactEmail}
                            onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-dark outline-none focus:ring-2 focus:ring-primary"
                            placeholder="iletisim@denizbank.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Logo URL</label>
                        <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="w-full border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-dark outline-none focus:ring-2 focus:ring-primary"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-slate-300 select-none cursor-pointer">
                            Aktif Durumda
                        </label>
                    </div>
                </form>
            </Modal>
        </>
    );
}
