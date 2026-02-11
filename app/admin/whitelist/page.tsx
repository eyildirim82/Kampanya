'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import {
    getWhitelistMembers, adminLogout, uploadWhitelist, uploadDebtorList,
    addWhitelistMember, updateWhitelistMember, deleteWhitelistMember,
    searchWhitelistMembers, bulkUpdateDebtorStatus, bulkDeleteMembers
} from '../actions';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';

type FilterType = 'all' | 'active' | 'inactive' | 'debtor';

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

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100;

    // Find & Replace state
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceAction, setReplaceAction] = useState<'set_debtor' | 'clear_debtor' | 'set_active' | 'set_inactive' | 'delete'>('set_debtor');
    const [frProcessing, setFrProcessing] = useState(false);

    // Selected rows
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchMembers = useCallback(() => {
        setLoading(true);
        if (searchQuery.trim() || activeFilter !== 'all') {
            searchWhitelistMembers(searchQuery, activeFilter, currentPage, pageSize)
                .then(result => {
                    setMembers(result.data);
                    setTotalCount(result.total);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            getWhitelistMembers()
                .then(data => {
                    setMembers(data);
                    setTotalCount(data.length);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
        setSelectedIds(new Set());
    }, [searchQuery, activeFilter, currentPage]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    // Debounced search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
        }, 300);
    };

    const handleFilterChange = (filter: FilterType) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

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
                fetchMembers();
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
                fetchMembers();
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
                fetchMembers();
            } else {
                setMessage({ text: result.message || 'Üye eklenemedi.', type: 'error' });
            }
        } catch {
            setMessage({ text: 'İşlem sırasında teknik bir hata oluştu.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const result = await updateWhitelistMember(id, !currentStatus);
        if (result.success) {
            fetchMembers();
        } else {
            setMessage({ text: result.message || 'Durum güncellenemedi.', type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu üyeyi silmek istediğinizden emin misiniz?')) return;

        const result = await deleteWhitelistMember(id);
        if (result.success) {
            setMessage({ text: 'Üye başarıyla silindi.', type: 'success' });
            fetchMembers();
        } else {
            setMessage({ text: result.message || 'Silme işlemi başarısız.', type: 'error' });
        }
    };

    // Selection handlers
    const toggleSelect = (tckn: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(tckn)) next.delete(tckn);
            else next.add(tckn);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === members.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(members.map((m: any) => m.tckn)));
        }
    };

    // Bulk actions on selected
    const handleBulkAction = async (action: 'set_debtor' | 'clear_debtor' | 'delete') => {
        const tckns = Array.from(selectedIds);
        if (tckns.length === 0) {
            setMessage({ text: 'Lütfen en az bir kayıt seçin.', type: 'error' });
            return;
        }

        if (action === 'delete') {
            if (!confirm(`${tckns.length} kayıt silinecek. Emin misiniz?`)) return;
            const result = await bulkDeleteMembers(tckns);
            setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
        } else {
            const setDebtor = action === 'set_debtor';
            const result = await bulkUpdateDebtorStatus(tckns, setDebtor);
            setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
        }
        fetchMembers();
    };

    // Find & Replace
    const handleFindReplace = async () => {
        if (!findText.trim()) {
            setMessage({ text: 'Lütfen TCKN girin.', type: 'error' });
            return;
        }

        setFrProcessing(true);
        setMessage(null);

        // Parse TCKNs (comma, newline or space separated)
        const tckns = findText
            .split(/[,\n\s]+/)
            .map(t => t.trim())
            .filter(t => /^\d{11}$/.test(t));

        if (tckns.length === 0) {
            setMessage({ text: 'Geçerli 11 haneli TCKN bulunamadı.', type: 'error' });
            setFrProcessing(false);
            return;
        }

        try {
            let result;
            if (replaceAction === 'set_debtor' || replaceAction === 'clear_debtor') {
                result = await bulkUpdateDebtorStatus(tckns, replaceAction === 'set_debtor');
            } else if (replaceAction === 'set_active' || replaceAction === 'set_inactive') {
                // Use individual updates for active status
                let successCount = 0;
                for (const tckn of tckns) {
                    const member = members.find((m: any) => m.tckn === tckn);
                    if (member) {
                        const res = await updateWhitelistMember(member.id, replaceAction === 'set_active');
                        if (res.success) successCount++;
                    }
                }
                result = { success: true, message: `${successCount} kayıt güncellendi.` };
            } else if (replaceAction === 'delete') {
                if (!confirm(`${tckns.length} kayıt silinecek. Emin misiniz?`)) {
                    setFrProcessing(false);
                    return;
                }
                result = await bulkDeleteMembers(tckns);
            }

            if (result) {
                setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
            }
            if (result?.success) {
                setFindText('');
                fetchMembers();
            }
        } catch {
            setMessage({ text: 'İşlem sırasında hata oluştu.', type: 'error' });
        } finally {
            setFrProcessing(false);
        }
    };

    const filterCounts = {
        all: totalCount,
        debtor: members.filter((m: any) => m.is_debtor).length,
    };

    const totalPages = Math.ceil(totalCount / pageSize);

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

                {/* Find & Replace Section */}
                {showFindReplace && (
                    <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 mb-8 border-l-4 border-amber-500">
                        <div className="md:grid md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-1">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Bul ve Değiştir</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    TCKN numaralarını girerek toplu işlem yapın. Birden fazla TCKN için virgül, boşluk veya yeni satır kullanın.
                                </p>
                            </div>
                            <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">TCKN Numaraları</label>
                                    <textarea
                                        value={findText}
                                        onChange={(e) => setFindText(e.target.value)}
                                        placeholder="11111111111, 22222222222&#10;veya her satıra bir TCKN"
                                        rows={4}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-gray-900 font-mono"
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                        {findText.split(/[,\n\s]+/).filter(t => /^\d{11}$/.test(t.trim())).length} geçerli TCKN bulundu
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Yapılacak İşlem</label>
                                    <select
                                        value={replaceAction}
                                        onChange={(e) => setReplaceAction(e.target.value as any)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-gray-900"
                                    >
                                        <option value="set_debtor">Borçlu Olarak İşaretle</option>
                                        <option value="clear_debtor">Borçlu İşaretini Kaldır</option>
                                        <option value="set_active">Aktif Yap</option>
                                        <option value="set_inactive">Pasif Yap</option>
                                        <option value="delete">Sil</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowFindReplace(false); setFindText(''); }}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleFindReplace}
                                        disabled={frProcessing}
                                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${replaceAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} ${frProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {frProcessing ? 'İşleniyor...' : 'Uygula'}
                                    </button>
                                </div>
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

                {/* Members List Section */}
                <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
                    {/* Header with actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                            Üye Listesi
                            <span className="ml-2 text-sm font-normal text-gray-500">({totalCount} kayıt)</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {!showAddForm && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="px-3 py-1.5 text-sm border border-transparent rounded-md shadow-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                >
                                    + Yeni Üye
                                </button>
                            )}
                            <button
                                onClick={() => setShowFindReplace(!showFindReplace)}
                                className={`px-3 py-1.5 text-sm border rounded-md shadow-sm font-medium ${showFindReplace ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Bul &amp; Değiştir
                            </button>
                            <button onClick={fetchMembers} className="px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-900 border border-indigo-200 rounded-md hover:bg-indigo-50">
                                Yenile
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="TCKN veya isim ile ara..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
                        {([
                            { key: 'all', label: 'Tümü' },
                            { key: 'active', label: 'Aktif' },
                            { key: 'debtor', label: 'Borçlu' },
                            { key: 'inactive', label: 'Pasif' },
                        ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => handleFilterChange(key)}
                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeFilter === key
                                    ? key === 'debtor'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-indigo-100 text-indigo-800'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Bulk actions bar (visible when items selected) */}
                    {selectedIds.size > 0 && (
                        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium text-indigo-800">
                                {selectedIds.size} kayıt seçili
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkAction('set_debtor')}
                                    className="px-3 py-1 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200 font-medium"
                                >
                                    Borçlu Yap
                                </button>
                                <button
                                    onClick={() => handleBulkAction('clear_debtor')}
                                    className="px-3 py-1 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200 font-medium"
                                >
                                    Borç Kaldır
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 font-medium"
                                >
                                    Sil
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="ml-auto text-xs text-indigo-600 hover:text-indigo-900"
                            >
                                Seçimi Temizle
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="flex flex-col">
                        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-3 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={members.length > 0 && selectedIds.size === members.length}
                                                        onChange={toggleSelectAll}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Yükleniyor...</td>
                                                </tr>
                                            ) : members.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                                        {searchQuery ? 'Arama kriterine uygun kayıt bulunamadı.' : 'Üye verisi bulunamadı.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                members.map((m: any) => (
                                                    <tr key={m.id} className={`${m.is_debtor ? 'bg-red-50' : ''} ${selectedIds.has(m.tckn) ? 'bg-indigo-50' : ''}`}>
                                                        <td className="px-3 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(m.tckn)}
                                                                onChange={() => toggleSelect(m.tckn)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                                                            {m.tckn}
                                                            {m.is_debtor && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">BORÇLU</span>}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {m.masked_name || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(m.synced_at || m.updated_at).toLocaleString('tr-TR')}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {m.is_active ? 'Aktif' : 'Pasif'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                            <div className="flex gap-1">
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-gray-700">
                                Sayfa <strong>{currentPage}</strong> / {totalPages} ({totalCount} kayıt)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    &larr; Önceki
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Sonraki &rarr;
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
