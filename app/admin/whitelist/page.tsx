'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getWhitelistMembers, adminLogout, uploadWhitelist, addWhitelistMember, updateWhitelistMember, deleteWhitelistMember, seedDemoData } from '../actions';
import Link from 'next/link';

export default function WhitelistPage() {
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addFormRef = useRef<HTMLFormElement>(null);

    const fetchMembers = () => {
        setLoading(true);
        getWhitelistMembers()
            .then(data => setMembers(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchMembers();
    }, []);

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
                setMessage({ text: result.message || 'Bir hata oluştu.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Beklenmedik bir hata oluştu.', type: 'error' });
        } finally {
            setUploading(false);
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
                setMessage({ text: result.message || 'Bir hata oluştu.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Beklenmedik bir hata oluştu.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const result = await updateWhitelistMember(id, !currentStatus);
        if (result.success) {
            fetchMembers(); // Refresh list
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

    const handleSeedDemo = async () => {
        if (!confirm('Demo verilerini yüklemek istediğinizden emin misiniz?')) {
            return;
        }

        setSeeding(true);
        setMessage(null);

        try {
            const result = await seedDemoData();
            if (result.success) {
                setMessage({ text: result.message || 'Demo veriler başarıyla yüklendi.', type: 'success' });
                fetchMembers(); // Refresh list
            } else {
                setMessage({ text: result.message || 'Demo veriler yüklenemedi.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Beklenmedik bir hata oluştu.', type: 'error' });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                                &larr; Dashboard'a Dön
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
                    <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* Demo Data Section */}
                <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Demo Verisi</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Test için demo üye verilerini yükleyin.
                            </p>
                        </div>
                        <button
                            onClick={handleSeedDemo}
                            disabled={seeding}
                            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none ${seeding ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {seeding ? 'Yükleniyor...' : 'Demo Verisi Yükle'}
                        </button>
                    </div>
                </div>

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
                                            <input type="text" name="tckn" id="tckn" required maxLength={11} pattern="[0-9]{11}" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                                        </div>
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">İsim Soyisim (Opsiyonel)</label>
                                            <input type="text" name="name" id="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
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

                {/* Upload Section */}
                <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 mb-8">
                    <div className="md:grid md:grid-cols-3 md:gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">CSV Yükle</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Üye listesini güncellemek için CSV dosyası yükleyin.
                                <br />
                                <span className="text-xs text-gray-400">Format: Sadece TCKN sütunu yeterlidir.</span>
                            </p>
                        </div>
                        <div className="mt-5 md:mt-0 md:col-span-2">
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dosya Seç</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                    <span>Dosya Seç</span>
                                                    <input id="file-upload" name="file" type="file" ref={fileInputRef} accept=".csv" className="sr-only" required />
                                                </label>
                                                <p className="pl-1">veya sürükleyip bırakın</p>
                                            </div>
                                            <p className="text-xs text-gray-500">Sadece CSV (Max 10MB)</p>
                                        </div>
                                    </div>
                                </div>


                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploading ? 'Yükleniyor...' : 'Listeyi Güncelle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Whitelist Members Section */}
                <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Mevcut Üye Listesi (Son 100)</h3>
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
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maskeli İsim</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Güncellenme Tarihi</th>
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
                                                members.map((m: any) => (
                                                    <tr key={m.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.masked_name || '-'}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                                                            {m.tckn}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(m.synced_at || m.updated_at).toLocaleString('tr-TR')}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {m.is_active ? 'Aktif' : 'Pasif'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleToggleStatus(m.id, m.is_active)}
                                                                    className={`px-2 py-1 text-xs rounded ${m.is_active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                                                >
                                                                    {m.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(m.id)}
                                                                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200"
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
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
