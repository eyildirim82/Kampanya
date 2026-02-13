'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Building, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteInstitution, upsertInstitution } from '../actions';

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
                        className="bg-[#002855] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003366] flex items-center gap-2"
                    >
                        <Plus size={16} />
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
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                    {inst.logo_url ? (
                                                        <img src={inst.logo_url} alt={inst.name} className="w-full h-full object-contain p-1" />
                                                    ) : (
                                                        <Building size={20} />
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
                                                    <CheckCircle size={12} /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    <XCircle size={12} /> Pasif
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
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(inst.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">
                                {editingId ? 'Kurumu Düzenle' : 'Yeni Kurum Ekle'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kurum Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002855]"
                                    placeholder="Örn: DenizBank"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kurum Kodu</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002855]"
                                    placeholder="Örn: DENIZBANK"
                                />
                                <p className="text-xs text-gray-500 mt-1">Sistem içi benzersiz kod.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">İletişim E-posta</label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002855]"
                                    placeholder="iletisim@denizbank.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                <input
                                    type="url"
                                    value={formData.logoUrl}
                                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002855]"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-[#002855] rounded focus:ring-[#002855]"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                    Aktif Durumda
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-[#002855] text-white rounded-lg text-sm font-bold hover:bg-[#003366] disabled:opacity-70 transition-colors flex items-center gap-2"
                                >
                                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
