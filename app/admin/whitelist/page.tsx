'use client';

import { useEffect, useState, useRef } from 'react';

import { getWhitelistMembers, adminLogout, uploadWhitelist, uploadDebtorList, addWhitelistMember, updateWhitelistMember, deleteWhitelistMember } from '../actions';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';

export default function WhitelistPage() {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [debtorUploading, setDebtorUploading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debtorFileInputRef = useRef<HTMLInputElement>(null);
    const addFormRef = useRef<HTMLFormElement>(null);

    // Search & Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 50;

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchMembers = () => {
        setLoading(true);
        // Updated to use search and pagination
        getWhitelistMembers(debouncedSearch, currentPage, limit)
            .then(res => {
                setMembers(res.data);
                setTotalCount(res.count);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchMembers();
        // eslint-disable-next-line
    }, [debouncedSearch, currentPage]);

    const handleLogout = async () => {
        await adminLogout();
    };

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await uploadWhitelist(null, formData);
            if (result.success) {
                setMessage({ text: result.message || 'Yükleme başarılı.', type: 'success' });
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchMembers(); // Refresh list
            } else {
                setMessage({ text: result.message || 'Dosya yüklenirken bir sorun oluştu.', type: 'error' });
            }
        } catch {
            setMessage({ text: 'İşlem sırasında teknik bir hata oluştu.', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDebtorUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDebtorUploading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await uploadDebtorList(null, formData);
            if (result.success) {
                setMessage({ text: result.message || 'Borçlu listesi yüklendi.', type: 'success' });
                if (debtorFileInputRef.current) debtorFileInputRef.current.value = '';
                fetchMembers(); // Refresh list
            } else {
                setMessage({ text: result.message || 'Borçlu listesi güncellenirken bir sorun oluştu.', type: 'error' });
            }
        } catch {
            setMessage({ text: 'İşlem sırasında teknik bir hata oluştu.', type: 'error' });
        } finally {
            setDebtorUploading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAdding(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await addWhitelistMember(null, formData);
            if (result.success) {
                setMessage({ text: result.message || 'Üye başarıyla eklendi.', type: 'success' });
                if (addFormRef.current) addFormRef.current.reset();
                setShowAddForm(false);
                fetchMembers(); // Refresh list
            } else {
                setMessage({ text: result.message || 'Üye eklenemedi.', type: 'error' });
            }
        } catch {
            setMessage({ text: 'İşlem sırasında teknik bir hata oluştu.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateStatus = async (id: string, updates: { is_active?: boolean; is_debtor?: boolean }) => {
        const result = await updateWhitelistMember(id, updates);
        if (result.success) {
            // Optimistic update or refresh
            fetchMembers();
        } else {
            setMessage({ text: result.message || 'Durum güncellenemedi.', type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu üyeyi silmek istediğinizden emin misiniz?')) {
            return;
        }

        const result = await deleteWhitelistMember(id);
        if (result.success) {
            setMessage({ text: 'Üye başarıyla silindi.', type: 'success' });
            fetchMembers(); // Refresh list
        } else {
            setMessage({ text: result.message || 'Silme işlemi başarısız.', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                                &larr; Dashboard&apos;a Dön
                            </Link>
                            <h1 className="text-xl font-bold text-gray-900">Whitelist Yönetimi</h1>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={handleLogout}
                                className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                            >
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

                {/* Message Display */}
                {message && (
                    <div className="mb-4">
                        <Alert
                            variant={message.type === 'success' ? 'success' : 'destructive'}
                            title={message.type === 'success' ? 'İşlem Başarılı' : 'İşlem Başarısız'}
                        >
                            {message.text}
                        </Alert>
                    </div>
                )}

                {/* Add Member Section */}
                {showAddForm && (
                    <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 mb-8">
                        <div className="md:grid md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-1">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Yeni Üye Ekle</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Tek tek üye eklemek için formu doldurun.
                                </p>
                            </div>
                            <div className="mt-5 md:mt-0 md:col-span-2">
                                <form ref={addFormRef} onSubmit={handleAddMember} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="tckn" className="block text-sm font-medium text-gray-700">TCKN *</label>
                                            <input type="text" name="tckn" id="tckn" required maxLength={11} pattern="[0-9]{11}" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900" />
                                        </div>
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">İsim Soyisim (Opsiyonel)</label>
                                            <input type="text" name="name" id="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input id="is_active_add" name="is_active" type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                        <label htmlFor="is_active_add" className="ml-2 block text-sm text-gray-900">Aktif</label>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddForm(false);
                                                if (addFormRef.current) addFormRef.current.reset();
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={adding}
                                            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${adding ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {adding ? 'Ekleniyor...' : 'Ekle'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Whitelist Upload Section */}
                    <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
                        <div className="md:grid md:grid-cols-1 md:gap-6">
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Whitelist Yükle (Aktif Üyeler)</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Normal üye listesini güncelle.
                                </p>
                            </div>
                            <div className="mt-4">
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dosya Seç (CSV)</label>
                                        <input name="file" type="file" ref={fileInputRef} accept=".csv" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" required />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${uploading ? 'opacity-50' : ''}`}
                                    >
                                        {uploading ? 'Yükleniyor...' : 'Whitelist Güncelle'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Debtor Upload Section */}
                    <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border-l-4 border-red-500">
                        <div className="md:grid md:grid-cols-1 md:gap-6">
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-red-900">Borçlu Listesi Yükle</h3>
                                <p className="mt-1 text-sm text-red-500">
                                    Borcu olan üyeleri işaretle (Başvuruları engellenecek).
                                </p>
                            </div>
                            <div className="mt-4">
                                <form onSubmit={handleDebtorUpload} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dosya Seç (CSV)</label>
                                        <input name="file" type="file" ref={debtorFileInputRef} accept=".csv" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" required />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={debtorUploading}
                                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${debtorUploading ? 'opacity-50' : ''}`}
                                    >
                                        {debtorUploading ? 'Yükleniyor...' : 'Borçluları İşaretle'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="w-full sm:w-1/2">
                        <label htmlFor="search" className="sr-only">Ara</label>
                        <div className="relative rounded-md shadow-sm">
                            <input
                                type="text"
                                name="search"
                                id="search"
                                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border text-gray-900"
                                placeholder="TCKN veya İsim ile ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">
                                    🔍
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Whitelist Members Section */}
                <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                            Mevcut Üye Listesi &nbsp;
                            <span className="text-sm font-normal text-gray-500">
                                ({totalCount} kayıt bulundu)
                            </span>
                        </h3>
                        <div className="flex gap-2">
                            {!showAddForm && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="px-3 py-1 text-sm border border-transparent rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                >
                                    + Yeni Üye Ekle
                                </button>
                            )}
                            <button onClick={fetchMembers} className="text-sm text-indigo-600 hover:text-indigo-900">Yenile</button>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Yükleniyor...</td>
                                                </tr>
                                            ) : members.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Üye verisi bulunamadı.</td>
                                                </tr>
                                            ) : (
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                members.map((m: any) => (
                                                    <tr key={m.id} className={m.is_debtor ? 'bg-red-50' : ''}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                                                            {m.tckn}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {m.masked_name || '-'}
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(m.synced_at || m.updated_at).toLocaleString('tr-TR')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {m.is_active ? 'Aktif' : 'Pasif'}
                                                                </span>
                                                                {m.is_debtor && (
                                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                                        BORÇLU
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div className="flex gap-2 flex-wrap max-w-xs">
                                                                {/* Active Toggle */}
                                                                <button
                                                                    onClick={() => handleUpdateStatus(m.id, { is_active: !m.is_active })}
                                                                    className={`px-2 py-1 text-xs rounded border ${m.is_active ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                                                                >
                                                                    {m.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                                                </button>

                                                                {/* Debtor Toggle */}
                                                                <button
                                                                    onClick={() => handleUpdateStatus(m.id, { is_debtor: !m.is_debtor })}
                                                                    className={`px-2 py-1 text-xs rounded border ${m.is_debtor ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                                                                >
                                                                    {m.is_debtor ? 'Borcu Yok' : 'Borçlu Yap'}
                                                                </button>

                                                                {/* Delete */}
                                                                <button
                                                                    onClick={() => handleDelete(m.id)}
                                                                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                >
                                                                    Sil
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                <div className="mt-4 flex justify-between items-center">
                                    <div className="text-sm text-gray-700">
                                        Sayfa {currentPage} / {Math.ceil(totalCount / limit) || 1}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                                        >
                                            Önceki
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            disabled={currentPage * limit >= totalCount}
                                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                                        >
                                            Sonraki
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
